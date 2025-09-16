<?php include "partials/header.php"; ?>
<?php include "config/db.php"; ?>

<?php
// Retrieve parameters from URL
$appID = isset($_GET['appID']) ? htmlspecialchars($_GET['appID']) : '';
$appName = isset($_GET['appName']) ? htmlspecialchars($_GET['appName']) : '';

// Pagination setup
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$rows_per_page = 6;

// Get total rows for this application
$sql = "SELECT * FROM master WHERE ApplicationID = '$appID'";
$result = $conn->query($sql);
$total_rows = $result->num_rows;
$total_pages = ceil($total_rows / $rows_per_page);

// Fetch only rows for current page
$start = ($page - 1) * $rows_per_page;
$sql_page = "SELECT * FROM master WHERE ApplicationID = '$appID' LIMIT $start, $rows_per_page";
$result_page = $conn->query($sql_page);

// Optional: disable all pagination buttons if only one page
$disable_all = ($total_pages <= 1);
?>

<div class="header-container">
    <div class="header-bar">
        <a href="homepage.php">
            <img src="assets/header-logo.png" alt="Companylogo">
        </a>

        <h3>Application Name: <?php echo $appName; ?> (<?php echo $appID; ?>)</h3>

        <div class="header-buttons">
            <form method="post" style="display:inline;">
                <input type="hidden" name="ApplicationID" value="<?php echo $appID; ?>">
                <input type="hidden" name="ApplicationName" value="<?php echo $appName; ?>">
                <button class="btn button-primary" name="add_row" type="submit">Add</button>
            </form>
            <a href="efforttable.php" class="btn button-secondary">Back</a>
        </div>
    </div>
</div>

<?php if (!$disable_all): ?>
<div class="pagination">
    <div class="pagination-fixed">
        <form method="get" style="display:inline;">
            <input type="hidden" name="appID" value="<?php echo $appID; ?>">
            <input type="hidden" name="appName" value="<?php echo $appName; ?>">
            <button class="pagination-btn" type="submit" name="page" value="1" <?php if ($disable_all || $page == 1) echo 'disabled'; ?>>&#8592;</button>
        </form>
        <form method="get" style="display:inline;">
            <input type="hidden" name="appID" value="<?php echo $appID; ?>">
            <input type="hidden" name="appName" value="<?php echo $appName; ?>">
            <button class="pagination-btn" type="submit" name="page" value="<?php echo max(1, $page-1); ?>" <?php if ($disable_all || $page == 1) echo 'disabled'; ?>>Prev</button>
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
            echo '<input type="hidden" name="appID" value="' . $appID . '">';
            echo '<input type="hidden" name="appName" value="' . $appName . '">';
            echo '<button class="pagination-btn' . ($i == $page ? ' active' : '') . '" type="submit" name="page" value="' . $i . '">' . $i . '</button>';
            echo '</form>';
        }
        ?>

        <form method="get" style="display:inline;">
            <input type="hidden" name="appID" value="<?php echo $appID; ?>">
            <input type="hidden" name="appName" value="<?php echo $appName; ?>">
            <button class="pagination-btn" type="submit" name="page" value="<?php echo min($total_pages, $page+1); ?>" <?php if ($disable_all || $page == $total_pages) echo 'disabled'; ?>>Next</button>
        </form>
        <form method="get" style="display:inline;">
            <input type="hidden" name="appID" value="<?php echo $appID; ?>">
            <input type="hidden" name="appName" value="<?php echo $appName; ?>">
            <button class="pagination-btn" type="submit" name="page" value="<?php echo $total_pages; ?>" <?php if ($disable_all || $page == $total_pages) echo 'disabled'; ?>>&#8594;</button>
        </form>
    </div>
    <div class="scroll-buttons-col">
        <button class="pagination-btn" onclick="scrollTable('left')" title="Go to first column"><<</button>
        <button class="pagination-btn" onclick="scrollTable('right')" title="Go to last column">>></button>
    </div>
</div>
<?php endif; ?>

<div class="table-container">
    <div class="table-scroll-wrapper">
        <table border="1" cellpadding="5" cellspacing="0">
            <tr>
                <th>S.No</th>
                <th>ApplicationID</th>
                <th>ApplicationName</th>
                <th>ResourceID</th>
                <th>ResourceName</th>
                <th>RoleName</th>
                <th>TotalEffort</th>
                <th>Rate</th>
                <th>TotalCost</th>
            </tr>

            <?php
            if ($result_page->num_rows > 0) {
                $sno = $start + 1;
                while ($row = $result_page->fetch_assoc()) {
                    echo "<tr>";
                    echo "<td>$sno</td>";
                    echo "<td>{$row['ApplicationID']}</td>";
                    echo "<td>{$row['ApplicationName']}</td>";
                    echo "<td>{$row['ResourceID']}</td>";
                    echo "<td>{$row['ResourceName']}</td>";
                    echo "<td>{$row['RoleName']}</td>";
                    echo "<td>{$row['TotalEffort']}</td>";
                    echo "<td>{$row['Rate']}</td>";
                    echo "<td>{$row['TotalCost']}</td>";
                    echo "</tr>";
                    $sno++;
                }
            } else {
                echo "<tr><td colspan='9'>No records found for this application.</td></tr>";
            }
            ?>
        </table>
    </div>
</div>

<script>
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
