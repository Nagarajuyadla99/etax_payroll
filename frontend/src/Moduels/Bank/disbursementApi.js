import API from "../../services/api";
import {
  createIdempotencyKey,
  formatFinancialApiError,
  getApiErrorDetail,
  idempotencyHeaders,
} from "../../utils/idempotency";

export { createIdempotencyKey, formatFinancialApiError, getApiErrorDetail };

export function listSalaryBatches() {
  return API.get("/disbursement/salary-batches");
}

export function getSalaryBatch(batchId) {
  return API.get(`/disbursement/salary-batches/${batchId}`);
}

export function createSalaryBatch(data, options = {}) {
  return API.post("/disbursement/salary-batches", data, {
    headers: idempotencyHeaders("salary-batch-create", options.idempotencyKey),
  });
}

export function approveSalaryBatchHr(batchId, body = { comment: "Approved by HR" }, options = {}) {
  return API.post(`/disbursement/salary-batches/${batchId}/approve/hr`, body, {
    headers: idempotencyHeaders("salary-batch-hr-approve", options.idempotencyKey),
  });
}

export function approveSalaryBatchFinance(
  batchId,
  body = { comment: "Approved by Finance" },
  options = {}
) {
  return API.post(`/disbursement/salary-batches/${batchId}/approve/finance`, body, {
    headers: idempotencyHeaders("salary-batch-finance-approve", options.idempotencyKey),
  });
}

export function payoutSalaryBatch(batchId, options = {}) {
  return API.post(
    `/disbursement/salary-batches/${batchId}/payout`,
    {},
    {
      headers: idempotencyHeaders("salary-batch-payout", options.idempotencyKey),
      validateStatus: (s) => s === 200 || s === 202,
    }
  );
}

export function retryFailedSalaryBatchItems(batchId, options = {}) {
  return API.post(
    `/disbursement/salary-batches/${batchId}/retry-failed`,
    {},
    {
      headers: idempotencyHeaders("salary-batch-retry-failed", options.idempotencyKey),
      validateStatus: (s) => s === 200 || s === 202,
    }
  );
}

export function generateSalaryBatchBankFile(batchId, options = {}) {
  return API.post(
    `/disbursement/salary-batches/${batchId}/artifacts/bank-file`,
    {},
    {
      headers: idempotencyHeaders("salary-batch-bank-file", options.idempotencyKey),
      validateStatus: (s) => s === 200 || s === 201,
    }
  );
}

export function listSalaryBatchArtifacts(batchId) {
  return API.get(`/disbursement/salary-batches/${batchId}/artifacts`);
}
