# Phase 1 Banking APIs

Base URL: `/api`

## Banking master
- `POST /banking/banks`
- `GET /banking/banks`
- `PUT /banking/banks/{bank_id}`
- `POST /banking/banks/{bank_id}/branches`
- `GET /banking/banks/{bank_id}/branches`
- `PUT /banking/branches/{branch_id}`
- `POST /banking/transfer-modes`
- `GET /banking/transfer-modes`
- `POST /banking/company-salary-accounts`
- `GET /banking/company-salary-accounts`

Validation helpers:
- `POST /banking/validate/ifsc`
- `POST /banking/validate/swift`

## Employee bank management
- `POST /employee-banking/accounts`
- `GET /employee-banking/employees/{employee_id}/accounts`
- `POST /employee-banking/accounts/{bank_account_id}/verify`

## Payroll disbursement
- `POST /disbursement/salary-batches`
- `GET /disbursement/salary-batches`
- `GET /disbursement/salary-batches/{batch_id}`
- `POST /disbursement/salary-batches/{batch_id}/approve/hr`
- `POST /disbursement/salary-batches/{batch_id}/approve/finance`
- `POST /disbursement/salary-batches/{batch_id}/payout`
- `POST /disbursement/salary-batches/{batch_id}/retry-failed`

Artifacts:
- `POST /disbursement/salary-batches/{batch_id}/artifacts/bank-file` (Phase 1: CSV)
- `GET /disbursement/salary-batches/{batch_id}/artifacts`

## Worker
Celery tasks (queued by the API):
- `payout.process_salary_batch(batch_id)`
- `payout.retry_failed_items(batch_id)`

