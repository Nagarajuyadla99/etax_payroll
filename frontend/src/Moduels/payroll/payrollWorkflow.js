import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../Context/AuthContext";

const STORAGE_KEY = "etax_payroll_workflow_v1";

export function readPayrollWorkflow() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writePayrollWorkflow(patch) {
  const next = { ...readPayrollWorkflow(), ...patch, updatedAt: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearPayrollWorkflow() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function resolveOrganisationId(user) {
  if (!user) return "";
  return (
    user?.organisation?.id ||
    user?.organisation?.organisation_id ||
    user?.user?.organisation_id ||
    ""
  );
}

export function resolveOrganisationName(user) {
  if (!user) return "";
  return user?.organisation?.name || user?.organisation?.organisation_name || "";
}

export function formatShortId(id) {
  if (!id) return "";
  const value = String(id);
  return value.length <= 8 ? value.toUpperCase() : value.slice(0, 8).toUpperCase();
}

export function payPeriodLabel(workflow) {
  if (!workflow) return "";
  if (workflow.payPeriodLabel) return workflow.payPeriodLabel;
  if (workflow.payPeriodStart && workflow.payPeriodEnd) {
    return `${workflow.payPeriodStart} → ${workflow.payPeriodEnd}`;
  }
  if (workflow.payPeriodId) return `Period #${formatShortId(workflow.payPeriodId)}`;
  return "";
}

export function payrollRunLabel(workflow) {
  if (!workflow) return "";
  if (workflow.payrollRunLabel) return workflow.payrollRunLabel;
  if (workflow.payrollRunId) return `Run #${formatShortId(workflow.payrollRunId)}`;
  return "";
}

export function usePayrollWorkflow() {
  const { user } = useContext(AuthContext);
  const [workflow, setWorkflowState] = useState(() => readPayrollWorkflow());

  const refresh = useCallback(() => {
    setWorkflowState(readPayrollWorkflow());
  }, []);

  const setWorkflow = useCallback((patch) => {
    const next = writePayrollWorkflow(patch);
    setWorkflowState(next);
    return next;
  }, []);

  const organisationId = workflow.organisationId || resolveOrganisationId(user);
  const organisationName = workflow.organisationName || resolveOrganisationName(user);

  return useMemo(
    () => ({
      workflow,
      refresh,
      setWorkflow,
      organisationId,
      organisationName,
      payPeriodId: workflow.payPeriodId || "",
      payPeriodLabel: payPeriodLabel(workflow),
      payrollRunId: workflow.payrollRunId || "",
      payrollRunLabel: payrollRunLabel(workflow),
    }),
    [workflow, refresh, setWorkflow, organisationId, organisationName]
  );
}

export function usePrefilledPayrollRunId(setRunId) {
  useEffect(() => {
    const wf = readPayrollWorkflow();
    if (wf.payrollRunId) {
      setRunId((current) => current || wf.payrollRunId);
    }
  }, [setRunId]);
}

export function usePrefilledOrganisationId(setOrganisationId) {
  const { user } = useContext(AuthContext);
  useEffect(() => {
    const wf = readPayrollWorkflow();
    const orgId = wf.organisationId || resolveOrganisationId(user);
    if (orgId) {
      setOrganisationId((current) => current || orgId);
    }
  }, [setOrganisationId, user]);
}
