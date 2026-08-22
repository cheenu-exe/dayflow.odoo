from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_admin_user, get_current_user
from app.models import EmployeeProfile, SalaryStructure, User
from app.schemas import PayslipResponse, SalaryStructureCreate, SalaryStructureResponse
from app.services.domain import calculate_prorated_payroll

router = APIRouter(prefix="/payroll", tags=["payroll"])


def _active_salary(db: Session, employee_id: str, month: date) -> SalaryStructure | None:
    month_end = date(month.year, month.month + 1, 1) if month.month < 12 else date(month.year + 1, 1, 1)
    return db.scalar(
        select(SalaryStructure)
        .where(SalaryStructure.employee_id == employee_id, SalaryStructure.effective_from < month_end)
        .order_by(SalaryStructure.effective_from.desc())
    )


@router.post("/employees/{user_id}/structures", response_model=SalaryStructureResponse, status_code=201)
def create_salary_structure(
    user_id: str,
    payload: SalaryStructureCreate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SalaryStructureResponse:
    employee = db.scalar(
        select(EmployeeProfile)
        .join(EmployeeProfile.user)
        .where(EmployeeProfile.user_id == user_id, User.organization_id == admin.organization_id)
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    salary = SalaryStructure(employee_id=employee.id, **payload.model_dump())
    db.add(salary)
    db.commit()
    db.refresh(salary)
    return salary


@router.get("/me/structures", response_model=list[SalaryStructureResponse])
def my_salary_structures(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[SalaryStructureResponse]:
    employee = db.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id))
    if not employee:
        return []
    return db.scalars(select(SalaryStructure).where(SalaryStructure.employee_id == employee.id).order_by(SalaryStructure.effective_from.desc())).all()


@router.get("/me/payslip", response_model=PayslipResponse)
def my_payslip(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    month: date,
) -> PayslipResponse:
    employee = db.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    salary = _active_salary(db, employee.id, month)
    if not salary:
        raise HTTPException(status_code=404, detail="No salary structure found for this month")
    result = calculate_prorated_payroll(employee.join_date, month, salary)
    return PayslipResponse(employee_id=employee.id, month=month, **result)


@router.get("/employees/{user_id}/payslip", response_model=PayslipResponse)
def employee_payslip(
    user_id: str,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    month: date,
) -> PayslipResponse:
    employee = db.scalar(
        select(EmployeeProfile)
        .join(EmployeeProfile.user)
        .where(EmployeeProfile.user_id == user_id, User.organization_id == admin.organization_id)
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    salary = _active_salary(db, employee.id, month)
    if not salary:
        raise HTTPException(status_code=404, detail="No salary structure found for this month")
    result = calculate_prorated_payroll(employee.join_date, month, salary)
    return PayslipResponse(employee_id=employee.id, month=month, **result)
