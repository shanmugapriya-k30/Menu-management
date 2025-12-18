from fastapi import APIRouter, Depends, HTTPException, UploadFile, File 
from sqlalchemy.orm import Session
from schemas.schemas import (
    RoleEffortCreate,
    EffortTrackerCreate,
    EffortTrackerWithEffortsCreate,
    RoleEffortBulkUpsert,
)
from core.database import get_db 
from typing import Optional
from datetime import datetime, timedelta
from utils.utils import parse_date
import csv, io
from models.models import EffortTracker, RoleEffort,Application,Resource, Role

from core.auth import require_roles

router = APIRouter()


@router.get("/api/efforttracker")
def get_efforttracker_list(db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    # In the updated model, the PK column is "Id" (uppercase), not "id"
    return db.query(EffortTracker).order_by(EffortTracker.Id.asc()).all()

 

@router.post("/api/efforttracker")
async def add_efforttracker(payload: EffortTrackerCreate, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    
    """
    Create a single EffortTracker (aggregate row).
    - Validates Application/Resource/Role exist (FK safety).
    - Computes TotalCost if it's not provided.
    - Removes legacy MigrationTracker coupling.
    """
    # ---- FK safety checks (recommended) ----
    # Application must exist
    app = db.query(Application).filter(Application.ApplicationID == payload.ApplicationID).first()
    if not app:
        raise HTTPException(status_code=400, detail=f"Invalid ApplicationID '{payload.ApplicationID}'")

    # Resource must exist if provided
    if payload.ResourceID is not None:
        res = db.query(Resource).filter(Resource.ResourceID == payload.ResourceID).first()
        if not res:
            raise HTTPException(status_code=400, detail=f"Invalid ResourceID '{payload.ResourceID}'")

    # Role must exist if provided
    if payload.RoleName:
        from models.models import Role  # import here to avoid circulars if any
        role = db.query(Role).filter(Role.RoleName == payload.RoleName).first()
        if not role:
            raise HTTPException(status_code=400, detail=f"Invalid RoleName '{payload.RoleName}'")

    # ---- Numeric defaults ----
    total_effort = float(payload.TotalEffort or 0.0)
    rate = float(payload.Rate or 0.0)
    total_cost = float(payload.TotalCost) if payload.TotalCost is not None else round(total_effort * rate, 2)

    # ---- Create record ----
    m = EffortTracker(
        ApplicationID=payload.ApplicationID,
        ApplicationName=payload.ApplicationName,
        ResourceID=payload.ResourceID,
        ResourceName=payload.ResourceName,
        RoleName=payload.RoleName,
        TotalEffort=total_effort,
        Rate=rate,
        TotalCost=total_cost,
        Grade=payload.Grade,
    )

    db.add(m)
    db.commit()
    db.refresh(m)

    # NOTE:  call to update  RL cost .
    return m

 

@router.post("/api/efforttracker_with_efforts")
async def add_effort_with_efforts(payload: EffortTrackerWithEffortsCreate, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Create an EffortTracker master row and upsert the corresponding RoleEffort rows
    in a single transaction.
    - Validates Application, Resource, Role (if provided).
    - Computes TotalEffort/TotalCost from the provided items and Rate.
    - Safely upserts RoleEffort rows to avoid unique-constraint violations.
    - Removes legacy MigrationTracker coupling.
    """

    # ---- FK safety checks ----
    # Application must exist
    app = db.query(Application).filter(Application.ApplicationID == payload.ApplicationID).first()
    if not app:
        raise HTTPException(status_code=400, detail=f"Invalid ApplicationID '{payload.ApplicationID}'")

    # Resource must exist if provided
    if payload.ResourceID is not None:
        res = db.query(Resource).filter(Resource.ResourceID == payload.ResourceID).first()
        if not res:
            raise HTTPException(status_code=400, detail=f"Invalid ResourceID '{payload.ResourceID}'")
        # If ResourceName wasn't provided, use the DB value
        if not payload.ResourceName:
            payload.ResourceName = res.ResourceName

    # Role must exist if provided
    if payload.RoleName:
        from models.models import Role  # local import to avoid circular deps if any
        role_row = db.query(Role).filter(Role.RoleName == payload.RoleName).first()
        if not role_row:
            raise HTTPException(status_code=400, detail=f"Invalid RoleName '{payload.RoleName}'")

    # ---- Compute totals from items ----
    # MondayValue is per-item (float). TotalEffort = sum(MondayValue) * 5
    item_values = []
    for it in payload.items:
        mv = float(it.MondayValue or 0.0)
        if mv < 0:
            raise HTTPException(status_code=400, detail="MondayValue cannot be negative")
        item_values.append(round(mv, 2))

    total_effort = round(sum(item_values) * 5, 2)
    rate = float(payload.Rate or 0.0)
    total_cost = round(total_effort * rate, 2)

    # ---- Create EffortTracker master row ----
    m = EffortTracker(
        ApplicationID=payload.ApplicationID,
        ApplicationName=payload.ApplicationName,
        ResourceID=payload.ResourceID,
        ResourceName=payload.ResourceName,
        RoleName=payload.RoleName,
        TotalEffort=total_effort,
        Rate=rate,
        TotalCost=total_cost,
        Grade=payload.Grade
    )
    db.add(m)
    db.flush()  # get PK and keep in the same transaction

    # ---- Upsert RoleEffort rows for each item ----
    for it in payload.items:
        value = round(float(it.MondayValue or 0.0), 2)
        # Upsert based on the unique key: (ApplicationID, ResourceID, RoleName, EffortDate)
        existing = db.query(RoleEffort).filter(
            RoleEffort.ApplicationID == payload.ApplicationID,
            RoleEffort.ResourceID == payload.ResourceID,
            RoleEffort.RoleName == payload.RoleName,
            RoleEffort.EffortDate == it.EffortDate
        ).first()

        if existing:
            existing.MondayValue = value
        else:
            db.add(RoleEffort(
                ApplicationID=payload.ApplicationID,
                ResourceID=payload.ResourceID,
                RoleName=payload.RoleName,
                EffortDate=it.EffortDate,
                MondayValue=value
            ))

    # ---- Commit and return ----
    db.commit()
    db.refresh(m)

    # NOTE: call to update RL cost (no longer part of new schema).
    return m




@router.post("/api/effort/upload")
async def upload_effort_data(csv_file: UploadFile = File(...), db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Upload CSV to create/update EffortTracker master rows and RoleEffort weekly entries.

    Expected columns (case/space-insensitive; BOM is stripped):
      - Base: ApplicationID, ApplicationName, DigitalUnit, ResourceID, ResourceName, RoleName, Rate, Grade, TotalEffort, TotalCost
      - Weekly effort columns: any column whose header parses as a date (YYYY-MM-DD) via utils.parse_date

    Behavior:
      - Ensures Resource exists (creates if missing).
      - Ensures Application exists (creates with defaults if missing).
      - Requires RoleName to exist in Role (FK RESTRICT). Rows with unknown RoleName are SKIPPED.
      - Upserts RoleEffort rows per unique key (ApplicationID, ResourceID, RoleName, EffortDate).
      - Aggregates to EffortTracker (create or update), recomputing TotalEffort/TotalCost if weekly provided.
      - Optionally updates Application.RLCost using update_application_total_RL_cost().
    """

    content = await csv_file.read()
    text = content.decode("utf-8", errors="ignore")
    reader = csv.reader(io.StringIO(text))

    try:
        header = next(reader)
    except StopIteration:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    normalized_header = [h.replace('\ufeff', '').replace(" ", "") for h in header]
    base_cols = {
        "ApplicationID", "ApplicationName", "DigitalUnit",
        "ResourceID", "ResourceName", "RoleName",
        "Rate", "Grade", "TotalEffort", "TotalCost"
    }
    effort_cols = [header[i] for i, h in enumerate(normalized_header) if h not in base_cols]

    inserted = skipped = updated = role_effort_created = 0

    def safe_float(value: str) -> float:
        try:
            v = value.strip()
            return float(v) if v else 0.0
        except Exception:
            return 0.0

    # Local import to avoid circulars if any
    from models.models import Role

    for row in reader:
        if all(not c.strip() for c in row):
            continue

        row_map = dict(zip(header, row))

        # Normalize keys: strip BOM/whitespace and map to canonical names
        norm_map = {}
        for k, v in row_map.items():
            key = k.replace('\ufeff', '').replace(' ', '')
            kl = key.lower()
            if kl in ["applicationid", "application id"]:
                key = "ApplicationID"
            elif kl in ["applicationname", "application name"]:
                key = "ApplicationName"
            elif kl in ["digitalunit", "digital unit"]:
                key = "DigitalUnit"
            elif kl in ["resourceid", "resource id"]:
                key = "ResourceID"
            elif kl in ["resourcename", "resource name"]:
                key = "ResourceName"
            elif kl in ["rolename", "role name"]:
                key = "RoleName"
            elif kl in ["totaleffort", "total effort"]:
                key = "TotalEffort"
            elif kl == "rate":
                key = "Rate"
            elif kl in ["totalcost", "total cost"]:
                key = "TotalCost"
            elif kl == "grade":
                key = "Grade"
            norm_map[key] = v

        app_id = (norm_map.get("ApplicationID", "")).strip()
        app_name = (norm_map.get("ApplicationName", "")).strip()
        res_id_str = (norm_map.get("ResourceID", "")).strip()
        res_name = (norm_map.get("ResourceName", "")).strip()
        role_name = (norm_map.get("RoleName", "")).strip()
        rate = safe_float(norm_map.get("Rate", ""))
        grade = (norm_map.get("Grade", "")).strip()
        digital_unit = (norm_map.get("DigitalUnit", "")).strip() or ""

        # Parse ResourceID as int if present
        try:
            resource_id = int(res_id_str) if res_id_str else None
        except Exception:
            resource_id = None

        # ---- Basic presence checks ----
        if not app_id or resource_id is None or not role_name:
            skipped += 1
            continue

        # ---- Role FK must exist ----
        role_obj = db.query(Role).filter(Role.RoleName == role_name).first()
        if not role_obj:
            # Skip rows with unknown role to avoid FK violations
            skipped += 1
            continue

        # ---- Ensure Resource exists ----
        res_obj = db.query(Resource).filter(Resource.ResourceID == resource_id).first()
        if not res_obj:
            db.add(Resource(ResourceID=resource_id, ResourceName=res_name, RoleName=role_name))
            db.flush()
        else:
            # Keep resource name in sync if provided
            if res_name and res_obj.ResourceName != res_name:
                res_obj.ResourceName = res_name
                db.flush()

        # ---- Ensure Application exists ----
        app_obj = db.query(Application).filter(Application.ApplicationID == app_id).first()
        if not app_obj:
            # Provide defaults for NOT NULL columns in new schema
            # Type / Status required; Rag default is 2; costs default to 0.
            db.add(Application(
                ApplicationID=app_id,
                ApplicationName=app_name or app_id,
                DigitalUnit=digital_unit or "UNKNOWN",
                InHouseOrVendor="",         # optional string in new schema
                Type="PNP",                 # sensible default
                Status="PNP_IN_PROGRESS",   # sensible default
                RAG=2                       # use uppercase if you applied the column rename; otherwise Rag=2
            ))
            db.flush()
        else:
            # If name differs, update it
            if app_name and app_obj.ApplicationName != app_name:
                app_obj.ApplicationName = app_name
                db.flush()

        # ---- Weekly effort columns -> list of (date, value)
        weekly = []
        for c in effort_cols:
            d = parse_date(c)  # your util returns a date or None
            if not d:
                continue
            val = safe_float(norm_map.get(c, ""))
            if val < 0:
                # enforce non-negative effort
                val = 0.0
            weekly.append((d, round(val, 2)))

        # ---- Compute totals (fallbacks if not supplied)
        total_effort = safe_float(norm_map.get("TotalEffort", ""))
        total_cost = safe_float(norm_map.get("TotalCost", ""))

        if weekly:
            total_effort = round(sum(v for _, v in weekly) * 5, 2)
            total_cost = round(total_effort * rate, 2)
        else:
            # If weekly not provided, still normalize inputs
            total_effort = round(total_effort, 2)
            total_cost = round(total_cost if total_cost else (total_effort * rate), 2)

        # ---- Upsert EffortTracker master (by ApplicationID, ResourceID, RoleName)
        existing = db.query(EffortTracker).filter(
            EffortTracker.ApplicationID == app_id,
            EffortTracker.ResourceID == resource_id,
            EffortTracker.RoleName == role_name
        ).first()

        if existing:
            changed = False
            if app_name and existing.ApplicationName != app_name:
                existing.ApplicationName = app_name
                changed = True
            if res_name and existing.ResourceName != res_name:
                existing.ResourceName = res_name
                changed = True
            if existing.Rate != rate:
                existing.Rate = rate
                changed = True
            if existing.Grade != grade:
                existing.Grade = grade
                changed = True

            if weekly:
                # Replace existing RoleEffort rows for this combo, then reinsert weekly
                db.query(RoleEffort).filter(
                    RoleEffort.ApplicationID == app_id,
                    RoleEffort.ResourceID == resource_id,
                    RoleEffort.RoleName == role_name
                ).delete(synchronize_session=False)

                for d, v in weekly:
                    db.add(RoleEffort(
                        ApplicationID=app_id,
                        ResourceID=resource_id,
                        RoleName=role_name,
                        EffortDate=d,
                        MondayValue=v
                    ))
                    role_effort_created += 1

                existing.TotalEffort = total_effort
                existing.TotalCost = total_cost
                changed = True

            if changed:
                updated += 1
        else:
            # Insert new EffortTracker master
            m = EffortTracker(
                ApplicationID=app_id,
                ApplicationName=app_name,
                ResourceID=resource_id,
                ResourceName=res_name,
                RoleName=role_name,
                TotalEffort=total_effort,
                Rate=rate,
                TotalCost=total_cost,
                Grade=grade
            )
            db.add(m)
            db.flush()

            # Insert RoleEffort rows
            for d, v in weekly:
                db.add(RoleEffort(
                    ApplicationID=app_id,
                    ResourceID=resource_id,
                    RoleName=role_name,
                    EffortDate=d,
                    MondayValue=v
                ))
                role_effort_created += 1

            inserted += 1

        # ---- Optionally update RL cost on Application (sum of EffortTracker.TotalCost)
        try:
            await update_application_total_RL_cost(app_id, db=db)
        except Exception:
            # don't fail the entire upload on RL cost recalculation; continue
            pass

    db.commit()

    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "effort_columns": effort_cols,
        "role_effort_created": role_effort_created
    }




@router.post("/api/role_effort")
async def add_role_effort(payload: RoleEffortCreate, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Upsert one RoleEffort row (unique key: ApplicationID, ResourceID, RoleName, EffortDate).
    - Validates Application, Resource, Role exist (FK safety).
    - Enforces MondayValue >= 0, rounds to 2 decimals.
    - Removes legacy MigrationTracker coupling.
    """

    # ---- FK safety checks ----
    # Application must exist
    app = db.query(Application).filter(Application.ApplicationID == payload.ApplicationID).first()
    if not app:
        raise HTTPException(status_code=400, detail=f"Invalid ApplicationID '{payload.ApplicationID}'")

    # Resource must exist
    res = db.query(Resource).filter(Resource.ResourceID == payload.ResourceID).first()
    if not res:
        raise HTTPException(status_code=400, detail=f"Invalid ResourceID '{payload.ResourceID}'")

    # Role must exist
    role = db.query(Role).filter(Role.RoleName == payload.RoleName).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Invalid RoleName '{payload.RoleName}'")

    # ---- MondayValue hygiene ----
    monday_value = float(payload.MondayValue or 0.0)
    if monday_value < 0:
        raise HTTPException(status_code=400, detail="MondayValue cannot be negative")
    monday_value = round(monday_value, 2)

    # ---- Upsert based on unique key ----
    existing = db.query(RoleEffort).filter(
        RoleEffort.ApplicationID == payload.ApplicationID,
        RoleEffort.ResourceID == payload.ResourceID,
        RoleEffort.RoleName == payload.RoleName,
        RoleEffort.EffortDate == payload.EffortDate,
    ).first()

    if existing:
        existing.MondayValue = monday_value
        db.commit()
        db.refresh(existing)
        return existing

    # Insert new row
    obj = RoleEffort(
        ApplicationID=payload.ApplicationID,
        ResourceID=payload.ResourceID,
        RoleName=payload.RoleName,
        EffortDate=payload.EffortDate,
        MondayValue=monday_value,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)

    # NOTE: Removed legacy update_migration_tracker_total_RL_cost() call
    return obj

 

@router.post("/api/role_effort/bulk_upsert")
async def bulk_upsert_effort(payload: RoleEffortBulkUpsert, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Upsert a batch of RoleEffort rows for (ApplicationID, ResourceID, RoleName),
    then recalculate the EffortTracker master totals.
    """

    # ---- FK safety checks ----
    # Application must exist
    app = db.query(Application).filter(Application.ApplicationID == payload.ApplicationID).first()
    if not app:
        raise HTTPException(status_code=400, detail=f"Invalid ApplicationID '{payload.ApplicationID}'")

    # Resource must exist
    res = db.query(Resource).filter(Resource.ResourceID == payload.ResourceID).first()
    if not res:
        raise HTTPException(status_code=400, detail=f"Invalid ResourceID '{payload.ResourceID}'")

    # Role must exist
    from models.models import Role  # local import to avoid circular deps if any
    role_row = db.query(Role).filter(Role.RoleName == payload.RoleName).first()
    if not role_row:
        raise HTTPException(status_code=400, detail=f"Invalid RoleName '{payload.RoleName}'")

    # ---- Upsert each item (respect unique key) ----
    for item in payload.items:
        value = float(item.MondayValue or 0.0)
        if value < 0:
            raise HTTPException(status_code=400, detail="MondayValue cannot be negative")
        value = round(value, 2)

        existing = db.query(RoleEffort).filter(
            RoleEffort.ApplicationID == payload.ApplicationID,
            RoleEffort.ResourceID == payload.ResourceID,
            RoleEffort.RoleName == payload.RoleName,
            RoleEffort.EffortDate == item.EffortDate,
        ).first()

        if existing:
            existing.MondayValue = value
        else:
            db.add(RoleEffort(
                ApplicationID=payload.ApplicationID,
                ResourceID=payload.ResourceID,
                RoleName=payload.RoleName,
                EffortDate=item.EffortDate,
                MondayValue=value,
            ))

    db.flush()

    # ---- Recalculate totals for the master (if provided) ----
    efforts = db.query(RoleEffort).filter(
        RoleEffort.ApplicationID == payload.ApplicationID,
        RoleEffort.ResourceID == payload.ResourceID,
        RoleEffort.RoleName == payload.RoleName,
    ).all()

    # Fix: convert all MondayValue to float before summing
    total_effort = round(sum(float(e.MondayValue or 0.0) for e in efforts) * 5, 2)

    master = None
    if payload.master_id is not None:
        master = db.query(EffortTracker).filter(EffortTracker.Id == payload.master_id).first()
        if master:
            master.TotalEffort = total_effort
            if payload.Grade is not None:
                master.Grade = payload.Grade
            rate = float(master.Rate or 0.0)
            master.TotalCost = round(total_effort * rate, 2)

    db.commit()

    if master:
        db.refresh(master)

    return {"master": master, "role_efforts": efforts}



@router.get("/api/role_effort")
def list_role_efforts(
    application_id: Optional[str] = None,
    resource_id: Optional[int] = None,
    role_name: Optional[str] = None,
    start_month: Optional[str] = None,   # expected format: YYYY-MM
    end_month: Optional[str] = None,     # expected format: YYYY-MM
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "user", "manager", "guest"))
):
    """
    List RoleEffort rows with optional filters.
    - Filters by ApplicationID, ResourceID, RoleName.
    - If start_month & end_month are provided (YYYY-MM), returns rows whose EffortDate
      is between the first day of start_month and the last day of end_month (inclusive).
    """
    query = db.query(RoleEffort)

    if application_id:
        query = query.filter(RoleEffort.ApplicationID == application_id)

    if resource_id is not None:
        query = query.filter(RoleEffort.ResourceID == resource_id)

    if role_name:
        query = query.filter(RoleEffort.RoleName == role_name)

    # Date-range filtering: inclusive first-of-start-month .. last-of-end-month
    if start_month and end_month:
        from datetime import date
        from calendar import monthrange

        def _parse_year_month(ym: str) -> tuple[int, int]:
            # strict YYYY-MM
            try:
                parts = ym.split("-")
                if len(parts) != 2:
                    raise ValueError
                y = int(parts[0])
                m = int(parts[1])
                if m < 1 or m > 12:
                    raise ValueError
                return y, m
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid month format '{ym}', expected YYYY-MM")

        sy, sm = _parse_year_month(start_month)
        ey, em = _parse_year_month(end_month)

        start_date = date(sy, sm, 1)
        end_last_day = monthrange(ey, em)[1]
        end_date = date(ey, em, end_last_day)

        query = query.filter(RoleEffort.EffortDate >= start_date, RoleEffort.EffortDate <= end_date)
    elif start_month or end_month:
        # If only one is provided, ask for both for clarity (keeps current API surface)
        raise HTTPException(status_code=400, detail="Provide both start_month and end_month in YYYY-MM format")

    return query.order_by(RoleEffort.EffortDate.asc()).all()



@router.put("/api/role_effort/update_existing")
async def update_existing_role_effort(payload: RoleEffortBulkUpsert, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Update existing RoleEffort rows for (ApplicationID, ResourceID, RoleName) on the given dates,
    inserting any missing rows, then recompute the EffortTracker master totals.

    - Validates Application/Resource/Role exist (FK safety).
    - Enforces MondayValue >= 0 and rounds to 2 decimals.
    - Uses EffortTracker.Id (uppercase) when referencing the master.
    """

    # ---- FK safety checks ----
    app = db.query(Application).filter(Application.ApplicationID == payload.ApplicationID).first()
    if not app:
        raise HTTPException(status_code=400, detail=f"Invalid ApplicationID '{payload.ApplicationID}'")

    res = db.query(Resource).filter(Resource.ResourceID == payload.ResourceID).first()
    if not res:
        raise HTTPException(status_code=400, detail=f"Invalid ResourceID '{payload.ResourceID}'")

    from models.models import Role  # local import to avoid circular deps if any
    role_row = db.query(Role).filter(Role.RoleName == payload.RoleName).first()
    if not role_row:
        raise HTTPException(status_code=400, detail=f"Invalid RoleName '{payload.RoleName}'")

    # ---- Update/Insert each item ----
    updated = 0
    for item in payload.items:
        value = float(item.MondayValue or 0.0)
        if value < 0:
            raise HTTPException(status_code=400, detail="MondayValue cannot be negative")
        value = round(value, 2)

        row = db.query(RoleEffort).filter(
            RoleEffort.ApplicationID == payload.ApplicationID,
            RoleEffort.ResourceID == payload.ResourceID,
            RoleEffort.RoleName == payload.RoleName,
            RoleEffort.EffortDate == item.EffortDate,
        ).first()

        if row:
            row.MondayValue = value
            updated += 1
        else:
            db.add(RoleEffort(
                ApplicationID=payload.ApplicationID,
                ResourceID=payload.ResourceID,
                RoleName=payload.RoleName,
                EffortDate=item.EffortDate,
                MondayValue=value,
            ))
            updated += 1

    # ---- Recompute master totals if master_id was provided ----
    master = None
    if payload.master_id is not None:
        master = db.query(EffortTracker).filter(EffortTracker.Id == payload.master_id).first()
        if master:
            efforts = db.query(RoleEffort).filter(
                RoleEffort.ApplicationID == master.ApplicationID,
                RoleEffort.ResourceID == master.ResourceID,
                RoleEffort.RoleName == master.RoleName,
            ).all()

            total_effort = round(sum(e.MondayValue or 0.0 for e in efforts) * 5, 2)
            master.TotalEffort = total_effort

            # Optional grade update
            if payload.Grade is not None:
                master.Grade = payload.Grade

            rate = float(master.Rate or 0.0)
            master.TotalCost = round(total_effort * rate, 2)

    db.commit()



@router.put("/api/role_effort/{effort_id}")
async def update_role_effort(effort_id: int, payload: RoleEffortCreate, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Update a single RoleEffort row by Id.
    - Validates Application/Resource/Role exist (FK safety).
    - Enforces MondayValue >= 0 and rounds to 2 decimals.
    - Prevents duplicate unique key (ApplicationID, ResourceID, RoleName, EffortDate) if keys change.
    """

    # Find the row by PK (uppercase Id in the new model)
    obj = db.query(RoleEffort).filter(RoleEffort.Id == effort_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="RoleEffort not found")

    # ---- FK safety checks ----
    # Application must exist
    app = db.query(Application).filter(Application.ApplicationID == payload.ApplicationID).first()
    if not app:
        raise HTTPException(status_code=400, detail=f"Invalid ApplicationID '{payload.ApplicationID}'")

    # Resource must exist
    res = db.query(Resource).filter(Resource.ResourceID == payload.ResourceID).first()
    if not res:
        raise HTTPException(status_code=400, detail=f"Invalid ResourceID '{payload.ResourceID}'")

    # Role must exist
    role_row = db.query(Role).filter(Role.RoleName == payload.RoleName).first()
    if not role_row:
        raise HTTPException(status_code=400, detail=f"Invalid RoleName '{payload.RoleName}'")

    # ---- MondayValue hygiene ----
    monday_value = float(payload.MondayValue or 0.0)
    if monday_value < 0:
        raise HTTPException(status_code=400, detail="MondayValue cannot be negative")
    monday_value = round(monday_value, 2)

    # ---- Unique key guard (if any of the key fields change) ----
    keys_changed = (
        obj.ApplicationID != payload.ApplicationID or
        obj.ResourceID != payload.ResourceID or
        obj.RoleName != payload.RoleName or
        obj.EffortDate != payload.EffortDate
    )
    if keys_changed:
        duplicate = db.query(RoleEffort).filter(
            RoleEffort.ApplicationID == payload.ApplicationID,
            RoleEffort.ResourceID == payload.ResourceID,
            RoleEffort.RoleName == payload.RoleName,
            RoleEffort.EffortDate == payload.EffortDate,
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="RoleEffort already exists for this ApplicationID/ResourceID/RoleName/EffortDate"
            )

    # ---- Apply updates ----
    obj.ApplicationID = payload.ApplicationID
    obj.ResourceID = payload.ResourceID
    obj.RoleName = payload.RoleName
    obj.EffortDate = payload.EffortDate
    obj.MondayValue = monday_value

    db.commit()
    db.refresh(obj)

    # NOTE: Removed legacy update_migration_tracker_total_RL_cost() call
    return obj




@router.get("/api/role_effort/total_effort")
def get_total_effort(
    application_id: str,
    resource_id: int,
    role_name: str,
    start_month: str,
    end_month: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "user", "manager", "guest"))
):
    """
    Compute total effort (sum of MondayValue * 5) for the given application/resource/role
    within the inclusive range from start_month to end_month (YYYY-MM).
    Returns the matching Monday rows too.
    """
    from datetime import date
    from calendar import monthrange

    def _parse_year_month(ym: str) -> tuple[int, int]:
        # Strict YYYY-MM parsing with clear errors
        try:
            parts = ym.split("-")
            if len(parts) != 2:
                raise ValueError
            y = int(parts[0])
            m = int(parts[1])
            if m < 1 or m > 12:
                raise ValueError
            return y, m
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid month format '{ym}', expected YYYY-MM")

    sy, sm = _parse_year_month(start_month)
    ey, em = _parse_year_month(end_month)

    start_date = date(sy, sm, 1)
    end_last_day = monthrange(ey, em)[1]
    end_date = date(ey, em, end_last_day)

    # Query rows in the inclusive date range
    mondays = (
        db.query(RoleEffort)
        .filter(
            RoleEffort.ApplicationID == application_id,
            RoleEffort.ResourceID == resource_id,
            RoleEffort.RoleName == role_name,
            RoleEffort.EffortDate >= start_date,
            RoleEffort.EffortDate <= end_date,
        )
        .order_by(RoleEffort.EffortDate.asc())
        .all()
    )

    # Sum MondayValue, treating None as 0.0, then multiply by 5
    total = round(sum(float(e.MondayValue or 0.0) for e in mondays) * 5, 2)

    return {
        "application_id": application_id,
        "resource_id": resource_id,
        "role_name": role_name,
        "total_effort": total,
        "mondays": [
            {"date": e.EffortDate, "value": float(e.MondayValue or 0.0), "id": e.Id}
            for e in mondays
        ],
    }



@router.delete("/api/role_effort/month/{year_month}")
def delete_role_effort_month(year_month: str, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Delete all RoleEffort rows within the given month (YYYY-MM), then
    recompute totals for only the affected EffortTracker masters.

    Month boundaries are inclusive (first day .. last day).
    """

    from datetime import date
    from calendar import monthrange

    # ---- Strict YYYY-MM parsing ----
    def _parse_year_month(ym: str) -> tuple[int, int]:
        try:
            parts = ym.split("-")
            if len(parts) != 2:
                raise ValueError
            y = int(parts[0])
            m = int(parts[1])
            if m < 1 or m > 12:
                raise ValueError
            return y, m
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid year_month format, expected YYYY-MM")

    y, m = _parse_year_month(year_month)

    start_date = date(y, m, 1)
    end_last_day = monthrange(y, m)[1]
    end_date = date(y, m, end_last_day)

    # ---- Find affected RoleEffort rows (and the master combos they belong to) ----
    efforts_q = db.query(RoleEffort).filter(
        RoleEffort.EffortDate >= start_date,
        RoleEffort.EffortDate <= end_date
    )

    # Collect unique (ApplicationID, ResourceID, RoleName) combos BEFORE deletion
    combos = {
        (e.ApplicationID, e.ResourceID, e.RoleName)
        for e in efforts_q.all()
    }

    # Delete in bulk
    deleted = efforts_q.delete(synchronize_session=False)

    # ---- Recompute totals only for affected masters ----
    # For each combo, recompute sum(MondayValue)*5 and update matching EffortTracker rows.
    for app_id, res_id, role_name in combos:
        combo_efforts = db.query(RoleEffort).filter(
            RoleEffort.ApplicationID == app_id,
            RoleEffort.ResourceID == res_id,
            RoleEffort.RoleName == role_name
        ).all()

        total_effort = round(sum(float(e.MondayValue or 0.0) for e in combo_efforts) * 5, 2)

        masters = db.query(EffortTracker).filter(
            EffortTracker.ApplicationID == app_id,
            EffortTracker.ResourceID == res_id,
            EffortTracker.RoleName == role_name
        ).all()

        for m_row in masters:
            m_row.TotalEffort = total_effort
            rate = float(m_row.Rate or 0.0)
            m_row.TotalCost = round(total_effort * rate, 2)

    db.commit()

    return {"deleted": deleted, "month": year_month}



@router.delete("/api/role_effort/date/{effort_date}")
def delete_role_effort_by_date(effort_date: str, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Delete all RoleEffort rows for the given date (YYYY-MM-DD), then
    recompute totals for only the affected EffortTracker masters.

    - Strict date parsing (YYYY-MM-DD)
    - DATE-safe comparisons (RoleEffort.EffortDate vs python date)
    - Efficient recompute: only affected (ApplicationID, ResourceID, RoleName) combos
    """

    from datetime import datetime

    # ---- Strict parsing of YYYY-MM-DD ----
    try:
        date_obj = datetime.strptime(effort_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    # ---- Find affected rows and combos BEFORE deletion ----
    rows_q = db.query(RoleEffort).filter(RoleEffort.EffortDate == date_obj)

    combos = {
        (r.ApplicationID, r.ResourceID, r.RoleName)
        for r in rows_q.all()
    }

    # ---- Delete all rows for that date ----
    deleted = rows_q.delete(synchronize_session=False)

    # ---- Recompute totals for affected masters only ----
    for app_id, res_id, role_name in combos:
        remaining_efforts = db.query(RoleEffort).filter(
            RoleEffort.ApplicationID == app_id,
            RoleEffort.ResourceID == res_id,
            RoleEffort.RoleName == role_name
        ).all()

        total_effort = round(sum(float(e.MondayValue or 0.0) for e in remaining_efforts) * 5, 2)

        masters = db.query(EffortTracker).filter(
            EffortTracker.ApplicationID == app_id,
            EffortTracker.ResourceID == res_id,
            EffortTracker.RoleName == role_name
        ).all()

        for m in masters:
            m.TotalEffort = total_effort
            rate = float(m.Rate or 0.0)
            m.TotalCost = round(total_effort * rate, 2)

    db.commit()

    return {"deleted": deleted, "date": effort_date}




@router.delete("/api/efforttracker/{effort_id}")
def delete_efforttracker(effort_id: int, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Delete an EffortTracker master row by Id and remove all RoleEffort rows
    that match the master's (ApplicationID, ResourceID, RoleName) combo.

    Uses uppercase PK 'Id' from the updated model.
    """
    # Find the master row by PK (uppercase 'Id' in the new model)
    m = db.query(EffortTracker).filter(EffortTracker.Id == effort_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Master row not found")

    deleted_efforts = 0

    # If the master has a complete combo, delete corresponding RoleEffort rows
    if m.ApplicationID and m.ResourceID and m.RoleName:
        deleted_efforts = (
            db.query(RoleEffort)
            .filter(
                RoleEffort.ApplicationID == m.ApplicationID,
                RoleEffort.ResourceID == m.ResourceID,
                RoleEffort.RoleName == m.RoleName,
            )
            .delete(synchronize_session=False)
        )

    # Delete the master row
    db.delete(m)
    db.commit()

    return {
        "deleted_effort_id": effort_id,
        "deleted_role_efforts": deleted_efforts,
    }



@router.get("/api/efforttracker/application/{app_id}")
def list_efforttracker_by_application(app_id: str, db: Session = Depends(get_db), current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    List EffortTracker rows for a given ApplicationID, ordered by Id (uppercase).
    Returns a list of dicts with column names as keys, dates/timestamps serialized to ISO strings.
    """
    rows = (
        db.query(EffortTracker)
        .filter(EffortTracker.ApplicationID == app_id)
        .order_by(EffortTracker.Id.asc())  # use uppercase PK
        .all()
    )

    out = []
    for r in rows:
        data = {}
        for col in r.__table__.columns:
            try:
                val = getattr(r, col.name)
                # Serialize date/datetime to ISO strings
                if hasattr(val, "isoformat"):
                    val = val.isoformat()
                # Convert Decimal to float for JSON friendliness (optional)
                # from decimal import Decimal
                # if isinstance(val, Decimal):
                #     val = float(val)
                data[col.name] = val
            except Exception:
                # Skip problematic fields to match your original behavior
                pass
        out.append(data)

    return out




# Replace the legacy helper with this one
async def update_application_total_RL_cost(app_id: str, db: Session, current_user = Depends(require_roles("admin", "user", "manager", "guest"))):
    """
    Recalculate RL cost for an application by summing EffortTracker.TotalCost
    and store it in Application.RLCost.

    This mirrors the old behavior that wrote into MigrationTracker.RLCost,
    but now updates the canonical Application table per the new schema.
    """
    try:
        app_row = db.query(Application).filter(Application.ApplicationID == app_id).first()
        if not app_row:
            raise HTTPException(status_code=404, detail="Application not found")

        efforts = (
            db.query(EffortTracker)
            .filter(EffortTracker.ApplicationID == app_id)
            .all()
        )

        rl_cost = round(sum(float(e.TotalCost or 0.0) for e in efforts), 2)
        app_row.RLCost = rl_cost

        db.commit()
        db.refresh(app_row)  # Ensure latest value is available after update
        return rl_cost
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating Application RL cost") from e
