<?php include "partials/header.php"; ?>
<?php include "config/db.php"; ?>
 
<?php

//CSV Upload and Processing
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST["upload_csv"])) {
    if (isset($_FILES["csv_file"]) && $_FILES["csv_file"]["error"] == 0) {
        $file = fopen($_FILES["csv_file"]["tmp_name"], "r");
 
        // Read header
        $header = fgetcsv($file);
        $headerMap = array_flip($header);
 
        // Define Monday columns
        $monday_columns = [
            '30Dec','06Jan','13Jan','20Jan','27Jan','03Feb','10Feb','17Feb','24Feb','03Mar','10Mar','17Mar','24Mar','31Mar',
            '07Apr','14Apr','21Apr','28Apr','05May','12May','19May','26May','02Jun','09Jun','16Jun','23Jun','30Jun',
            '07Jul','14Jul','21Jul','28Jul','04Aug','11Aug','18Aug','25Aug','01Sep','08Sep','15Sep','22Sep','29Sep',
            '06Oct','13Oct','20Oct','27Oct','03Nov','10Nov','17Nov','24Nov','01Dec','08Dec','15Dec','22Dec','29Dec'
        ];
 
        // Function to check for duplicates
        function isDuplicate($conn, $appID, $resID, $role, $totalEffort, $rate, $totalCost, $dateEfforts) {
            $query = "SELECT * FROM Master WHERE ApplicationID = '$appID' AND ResourceID = '$resID' AND RoleName = '$role'";
            $result = $conn->query($query);
 
            if ($result->num_rows > 0) {
                $existing = $result->fetch_assoc();
 
                if (
                    floatval($existing['TotalEffort']) == $totalEffort &&
                    floatval($existing['Rate']) == $rate &&
                    floatval($existing['TotalCost']) == $totalCost
                ) {
                    foreach ($dateEfforts as $col => $effort) {
                        if (isset($existing[$col]) && floatval($existing[$col]) != $effort) {
                            return false; // Difference found
                        }
                    }
                    return true; // All match
                }
            }
            return false; // No record or mismatch
        }
 
        while (($row = fgetcsv($file)) !== FALSE) {
            $appID = $row[$headerMap['ApplicationID']];
            $appName = $row[$headerMap['ApplicationName']];
            $resID = $row[$headerMap['ResourceID']];
            $resName = $row[$headerMap['ResourceName']];
            $role = $row[$headerMap['RoleName']];
 
            // Fetch rate from Role table
            $rateQuery = $conn->query("SELECT Rate FROM Role WHERE RoleName = '$role'");
            $rateRow = $rateQuery->fetch_assoc();
            $dbRate = $rateRow ? floatval($rateRow['Rate']) : 0;
 
            // Get Rate from CSV or fallback to DB
            $rate = isset($headerMap['Rate']) && $row[$headerMap['Rate']] !== '' ? floatval($row[$headerMap['Rate']]) : $dbRate;
 
            // Collect effort values
            $totalEffort = 0;
            $dateEfforts = [];
 
            foreach ($monday_columns as $col) {
                $effort = isset($headerMap[$col]) ? floatval($row[$headerMap[$col]]) : 0;
                $dateEfforts[$col] = $effort;
 
                if ($effort > 0) {
                    $totalEffort += 5;
                }
            }
 
            // Use CSV TotalEffort if available
            if (isset($headerMap['TotalEffort']) && $row[$headerMap['TotalEffort']] !== '') {
                $totalEffort = floatval($row[$headerMap['TotalEffort']]);
            }
 
            // Use CSV TotalCost if available
            $totalCost = isset($headerMap['TotalCost']) && $row[$headerMap['TotalCost']] !== ''
                ? floatval($row[$headerMap['TotalCost']])
                : $totalEffort * $rate;
 
            // Ensure foreign keys exist
            $conn->query("INSERT IGNORE INTO Application (ApplicationID, ApplicationName) VALUES ('$appID', '$appName')");
            $conn->query("INSERT IGNORE INTO Resource (ResourceID, ResourceName) VALUES ('$resID', '$resName')");
            $conn->query("INSERT IGNORE INTO Role (RoleName, Rate) VALUES ('$role', '$rate')");
 
            // Build insert query
            $columns = "ApplicationID, ApplicationName, ResourceID, ResourceName, RoleName, TotalEffort, Rate, TotalCost";
            $values = "'$appID', '$appName', '$resID', '$resName', '$role', '$totalEffort', '$rate', '$totalCost'";
 
            foreach ($monday_columns as $col) {
                $columns .= ", `$col`";
                $values .= ", '" . ($dateEfforts[$col] ?? 0) . "'";
            }
 
            // Insert only if not duplicate
            if (!isDuplicate($conn, $appID, $resID, $role, $totalEffort, $rate, $totalCost, $dateEfforts)) {
                $sql = "INSERT INTO Master ($columns) VALUES ($values)";
                $conn->query($sql);
            }
        }
 
        fclose($file);
        header("Location: efforttable.php");
        exit();
    } else {
        echo "<script>alert('Error uploading file.');</script>";
    }
}


// Save new row to database
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['save_new'])) {
    $appID = $_POST['ApplicationID'];
    $appName = $_POST['ApplicationName'];
    $resID = $_POST['ResourceID'];
    $resName = $_POST['ResourceName'];
    $role = $_POST['RoleName'];
    $rate = floatval($_POST['Rate']);
 
    // Ensure ApplicationID exists in application table
    $checkApp = $conn->query("SELECT * FROM application WHERE ApplicationID = '$appID'");
    if ($checkApp->num_rows == 0) {
        $conn->query("INSERT INTO application (ApplicationID, ApplicationName) VALUES ('$appID', '$appName')");
    }
 
    // Ensure ResourceID exists in resource table
    $checkRes = $conn->query("SELECT * FROM resource WHERE ResourceID = '$resID'");
    if ($checkRes->num_rows == 0) {
        $conn->query("INSERT INTO resource (ResourceID, ResourceName) VALUES ('$resID', '$resName')");
    }
 
    // Ensure RoleName exists in role table
    $checkRole = $conn->query("SELECT * FROM role WHERE RoleName = '$role'");
    if ($checkRole->num_rows == 0) {
        $conn->query("INSERT INTO role (RoleName, Rate) VALUES ('$role', '$rate')");
    }
 
    $totalEffort = 0;
    $dateEfforts = [];
    foreach ($_POST as $key => $value) {
    if (preg_match('/^date_/', $key)) {
        $col = substr($key, 5);
        $effort = floatval($value);
        $dateEfforts[$col] = $effort;
        $totalEffort += $effort;
    }
}
 
// Multiply by 5 to get total effort in hours
    $totalEffort *= 5;
    $totalCost = $totalEffort * $rate;
 
    $columns = "ApplicationID, ApplicationName, ResourceID, ResourceName, RoleName, TotalEffort, Rate, TotalCost";
    $values = "'$appID', '$appName', '$resID', '$resName', '$role', '$totalEffort', '$rate', '$totalCost'";
 
    foreach ($dateEfforts as $col => $val) {
        $columns .= ", `$col`";
        $values .= ", '$val'";
    }
 
    $sql = "INSERT INTO master ($columns) VALUES ($values)";
    $conn->query($sql);
    header("Location: efforttable.php");
    exit();
}
// Update existing row in database
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['save_edit'])) {
    $row_id = $_POST['row_id'];
    $resID = $_POST['ResourceID'];
    $appID = $_POST['ApplicationID'];
    $appName = $_POST['ApplicationName'];
    $resName = $_POST['ResourceName'];
    $role = $_POST['RoleName'];
    $rate = floatval($_POST['Rate']);
    $totalEffort = 0;
$dateEfforts = [];
foreach ($_POST as $key => $value) {
    if (preg_match('/^date_/', $key)) {
        $col = substr($key, 5);
        $effort = floatval($value);
        $dateEfforts[$col] = $effort;
        $totalEffort += $effort;
    }
}
 
// Multiply by 5 to get total effort in hours
$totalEffort *= 5;
    $totalCost = $totalEffort * $rate;
    $setClause = "ApplicationID='$appID', ApplicationName='$appName', ResourceID='$resID', ResourceName='$resName', RoleName='$role', TotalEffort='$totalEffort', Rate='$rate', TotalCost='$totalCost'";
    foreach ($dateEfforts as $col => $val) {
        $setClause .= ", `$col`='$val'";
    }
    $sql = "UPDATE master SET $setClause WHERE id='$row_id'";
    $conn->query($sql);
    // Update  tables
    $conn->query("UPDATE application SET ApplicationName='$appName' WHERE ApplicationID='$appID'");
    $conn->query("UPDATE resource SET ResourceName='$resName' WHERE ResourceID='$resID'"); 
    $conn->query("UPDATE master SET ResourceName='$resName' WHERE ResourceID='$resID'"); 
    $conn->query("UPDATE role SET Rate='$rate' WHERE RoleName='$role'");
    header("Location: efforttable.php");
    exit();
}
 
// Delete row from database
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['delete_row'])) {
    $row_id = $_POST['delete_row_id'];
    $conn->query("DELETE FROM master WHERE id='$row_id'");
    header("Location: efforttable.php");
    exit();
}
 
$monday_columns = [
    '30Dec','06Jan','13Jan','20Jan','27Jan','03Feb','10Feb','17Feb','24Feb','03Mar','10Mar','17Mar','24Mar','31Mar',
    '07Apr','14Apr','21Apr','28Apr','05May','12May','19May','26May','02Jun','09Jun','16Jun','23Jun','30Jun',
    '07Jul','14Jul','21Jul','28Jul','04Aug','11Aug','18Aug','25Aug','01Sep','08Sep','15Sep','22Sep','29Sep',
    '06Oct','13Oct','20Oct','27Oct','03Nov','10Nov','17Nov','24Nov','01Dec','08Dec','15Dec','22Dec','29Dec'
];
 
$sql = "SELECT * FROM master";
$result = $conn->query($sql);
$edit_row_id = isset($_POST['edit_row_id']) ? $_POST['edit_row_id'] : null;

// Pagination
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$rows_per_page = 6;
$total_rows = $result->num_rows;
$total_pages = ceil($total_rows / $rows_per_page);

// Fetch only rows for current page
$start = ($page - 1) * $rows_per_page;
$sql_page = "SELECT * FROM master LIMIT $start, $rows_per_page";
$result_page = $conn->query($sql_page);
?>


<div class="header-container">
    <div class="header-bar">
        <a href="homepage.php">
            <img src="assets/header-logo.png" alt="Companylogo"></img>
        </a>
        <div class="header-buttons">
            <form method="post">
                <button class="btn button-primary" name="add_row" type="submit">Add</button>
            </form>
            <button class="btn button-primary" onclick="showModal('uploadModal')">Upload CSV</button>
        </div>
    </div>
</div>
<div class="title-container">
    <h2>Effort Table</h2>
    <div class="pagination-fixed">
    <form method="get" style="display:inline;">
        <button class="pagination-btn" type="submit" name="page" value="1" <?php if ($page == 1) echo 'disabled'; ?>>&#8592;</button>
    </form>
    <form method="get" style="display:inline;">
        <button class="pagination-btn" type="submit" name="page" value="<?php echo max(1, $page-1); ?>" <?php if ($page == 1) echo 'disabled'; ?>>Prev</button>
    </form>
    <?php
    $max_display = 5;
    $start_page = max(1, $page - 2);
    $end_page = min($total_pages, $start_page + $max_display - 1);
    if ($end_page - $start_page < $max_display - 1) {
        $start_page = max(1, $end_page - $max_display + 1);
    }
    for ($i = $start_page; $i <= $end_page; $i++) {
        echo '<form method="get" style="display:inline;">';
        echo '<button class="pagination-btn' . ($i == $page ? ' active' : '') . '" type="submit" name="page" value="' . $i . '">' . $i . '</button>';
        echo '</form>';
    }
    ?>
    <form method="get" style="display:inline;">
        <button class="pagination-btn" type="submit" name="page" value="<?php echo min($total_pages, $page+1); ?>" <?php if ($page == $total_pages) echo 'disabled'; ?>>Next</button>
    </form>
    <form method="get" style="display:inline;">
        <button class="pagination-btn" type="submit" name="page" value="<?php echo $total_pages; ?>" <?php if ($page == $total_pages) echo 'disabled'; ?>>&#8594;</button>
    </form>
     <div class="scroll-buttons-col">
            <button class="pagination-btn" onclick="scrollTable('left')" title="Go to first column"><<</button>
            <button class="pagination-btn" onclick="scrollTable('right')" title="Go to last column">>></button>
        </div>
</div>
</div>
<div class="table-container">
    <div class="table-scroll-wrapper">
        <table border="1" cellpadding="5" cellspacing="0" id="effortTable">
            <tr>
                <th class="first-col">S.No</th>
                <th class="first-col">ApplicationID</th>
                <th class="first-col">ApplicationName</th>
                <th class="first-col">ResourceID</th>
                <th class="first-col">ResourceName</th>
                <th class="first-col">RoleName</th>
                <?php foreach ($monday_columns as $col) echo "<th class='date-col'>$col</th>"; ?>
                <th class="total-col">TotalEffort</th>
                <th class="total-col">Rate</th>
                <th class="total-col">TotalCost</th>
                <th class="action-col">Action</th>
            </tr>
            <?php if (isset($_POST['add_row'])): ?>
            <form method="post" id="addRowForm">
                <tr>
                    <td></td>
                    <td><input type="text" name="ApplicationID" id="addAppID" required onblur="fetchAppName()"></td>
                    <td><input type="text" name="ApplicationName" id="addAppName" required></td>
                    <td><input type="text" name="ResourceID" required></td>
                    <td><input type="text" name="ResourceName" required></td>
                    <td><input type="text" name="RoleName" id="addRoleName" required onblur="fetchRoleRate()"></td>
                    <?php foreach ($monday_columns as $col): ?>
                        <td><input type="number" step="0.01" name="date_<?= $col ?>" class="effort-input" oninput="calculateEffortAndCost()"></td>
                    <?php endforeach; ?>
                    <td><input type="number" step="0.01" name="TotalEffort" id="totalEffort" readonly></td>
                    <td><input type="number" step="0.01" name="Rate" id="rateInput" oninput="calculateEffortAndCost()" required></td>
                    <td><input type="number" step="0.01" name="TotalCost" id="totalCost" readonly></td>
                    <td>
                        <button type="submit" class="btn button-success" name="save_new">Save</button>
                        <button type="button"  class="btn button-cancel" onclick="window.location='efforttable.php'">Cancel</button>
                    </td>
                </tr>
            </form>
            <?php endif; ?>
            <?php
            if ($result_page->num_rows > 0) {
                $sno = $start + 1;
                while($row = $result_page->fetch_assoc()) {
                    if ($edit_row_id == $row['id']) {
                        // Edit mode for this row
                        echo '<form method="post">';
                        echo "<tr>";
                        echo "<input type='hidden' name='row_id' value='{$row['id']}'>";
                        echo "<td>$sno</td>";
                        echo "<td><input type='text' name='ApplicationID' value='{$row['ApplicationID']}' required></td>";
                        echo "<td><input type='text' name='ApplicationName' value='{$row['ApplicationName']}' required></td>";
                        echo "<td><input type='text' name='ResourceID' value='{$row['ResourceID']}' required></td>";
                        echo "<td><input type='text' name='ResourceName' value='{$row['ResourceName']}' required></td>";
                        echo "<td><input type='text' name='RoleName' value='{$row['RoleName']}' required></td>";
                        foreach ($monday_columns as $col) {
                            $val = isset($row[$col]) ? $row[$col] : '';
                            echo "<td><input type='number' step='0.01' name='date_$col' value='$val' class='effort-input' oninput='calculateEffortAndCost()'></td>";
                        }
                        echo "<td><input type='number' step='0.01' name='TotalEffort' id='totalEffort' value='{$row['TotalEffort']}' readonly></td>";
                        echo "<td><input type='number' step='0.01' name='Rate' id='rateInput' value='{$row['Rate']}' oninput='calculateEffortAndCost()' required></td>";
                        echo "<td><input type='number' step='0.01' name='TotalCost' id='totalCost' value='{$row['TotalCost']}' readonly></td>";
                        echo "<td>";
                        echo "<button type='submit' class=\"btn button-success\" name='save_edit'>Save</button>";
                        echo "<button type='button'class=\"btn button-cancel\" onclick='window.location=\"efforttable.php\"'>Cancel</button>";
                        echo "</td>";
                        echo "</tr>";
                        echo '</form>';
                    } else {
                        echo "<tr>";
                        echo "<td>" . $sno++ . "</td>";
                        echo "<td><a href='application_view.php?appID=" . urlencode($row['ApplicationID']) . "&appName=" . urlencode($row['ApplicationName']) . "' style='color:black;text-decoration:none;'>" . htmlspecialchars($row['ApplicationID']) . "</a></td>";
                        echo "<td><a href='application_view.php?appID=" . urlencode($row['ApplicationID']) . "&appName=" . urlencode($row['ApplicationName']) . "' style='color:black;text-decoration:none;'>" . htmlspecialchars($row['ApplicationName']) . "</a></td>";
                        echo "<td>{$row['ResourceID']}</td>";
                        echo "<td>{$row['ResourceName']}</td>";
                        echo "<td>{$row['RoleName']}</td>";
                        foreach ($monday_columns as $col) {
                            echo "<td>" . (isset($row[$col]) ? $row[$col] : '') . "</td>";  
                        }
                        echo "<td>{$row['TotalEffort']}</td>";
                        echo "<td>{$row['Rate']}</td>";
                        echo "<td>{$row['TotalCost']}</td>";
                        echo "<td>";
                        echo '<form method="post" style="display:inline;"><input type="hidden" name="edit_row_id" value="' . $row['id'] . '"><button  class="btn" type="submit">Edit</button></form> ';
                        echo '<form method="post" style="display:inline;"><input type="hidden" name="delete_row_id" value="' . $row['id'] . '"><button  class="btn button-danger" type="submit" name="delete_row" onclick="return confirm(\'Are you sure you want to delete this row?\')">Delete</button></form>';
                        echo "</td>";
                        echo "</tr>";
                    }
                }
            } else {
                echo "<tr><td colspan='" . (6 + count($monday_columns) + 4) . "'>No records found</td></tr>";
            }
            ?>
        </table>
        
    </div>
</div>

    <!-- Upload Modal -->
    <div id="uploadModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal('uploadModal')">×</span>
            <form method="post" enctype="multipart/form-data">
                <label>Choose CSV File:</label>
                <input type="file" name="csv_file" accept=".csv" required>
                <button type="submit" name="upload_csv" class="btn button-success">Submit</button>
            </form>
        </div>
    </div>
 
<script>
function showModal(id) {
    document.getElementById(id).style.display = 'block';
}
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}
 
function calculateEffortAndCost() {
    let inputs = document.querySelectorAll('.effort-input');
    let total = 0;
    inputs.forEach(input => {
        let val = parseFloat(input.value);
        if (!isNaN(val)) total += val;
    });
    document.getElementById('totalEffort').value = total.toFixed(2);
 
    let rate = parseFloat(document.getElementById('rateInput').value);
    if (!isNaN(rate)) {
        document.getElementById('totalCost').value = (total * rate).toFixed(2);
    }
}
 
function fetchDetails(type, value, targetName) {
    if (value === '') return;
 
    let url = `fetch_details.php?type=${type}&${type === 'role' ? 'name' : 'id'}=${encodeURIComponent(value)}`;
    fetch(url)
        .then(response => response.text())
        .then(data => {
            const input = document.getElementsByName(targetName)[0];
            if (input) {
                const cleanData = data.trim();
                input.value = cleanData;
                if (targetName === 'Rate') calculateEffortAndCost();
            }
        });
}
 
// Event listeners
document.getElementsByName('ApplicationID')[0].addEventListener('blur', function() {
    fetchDetails('application', this.value, 'ApplicationName');
});
 
document.getElementsByName('ResourceID')[0].addEventListener('blur', function() {
    fetchDetails('resource', this.value, 'ResourceName');
});
 
document.getElementsByName('RoleName')[0].addEventListener('blur', function() {
    fetchDetails('role', this.value, 'Rate');
});
 
function scrollTable(direction) {
    var container = document.querySelector('.table-scroll-wrapper');
    if (direction === 'left') {
        container.scrollLeft = 0;
    } else if (direction === 'right') {
        container.scrollLeft = container.scrollWidth;
    }
}
</script>

<?php include "partials/footer.php"; ?>
