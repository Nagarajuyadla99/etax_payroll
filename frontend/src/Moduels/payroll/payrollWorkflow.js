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

/**
 * Drop stale tenant IDs from session workflow when they disagree with /users/me.
 * Keeps pay-period/run pointers only when the cached org matches auth.
 */
export function reconcilePayrollWorkflowWithUser(user) {
  const authOrgId = resolveOrganisationId(user);
  if (!authOrgId) return readPayrollWorkflow();

  const wf = readPayrollWorkflow();
  const cachedOrgId = wf.organisationId ? String(wf.organisationId) : "";
  const authOrg = String(authOrgId);

  if (cachedOrgId && cachedOrgId !== authOrg) {
    return writePayrollWorkflow({
      organisationId: authOrg,
      organisationName: resolveOrganisationName(user),
      payPeriodId: "",
      payPeriodLabel: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      payrollRunId: "",
      payrollRunLabel: "",
    });
  }

  if (!cachedOrgId) {
    return writePayrollWorkflow({
      organisationId: authOrg,
      organisationName: resolveOrganisationName(user) || wf.organisationName || "",
    });
  }

  return wf;
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

  const authOrganisationId = resolveOrganisationId(user);
  const authOrganisationName = resolveOrganisationName(user);
  const organisationId = authOrganisationId || workflow.organisationId || "";
  const organisationName = authOrganisationName || workflow.organisationName || "";

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
    const wf = reconcilePayrollWorkflowWithUser(user);
    const orgId = resolveOrganisationId(user) || wf.organisationId;
    if (orgId) {
      setOrganisationId(orgId);
    }
  }, [setOrganisationId, user]);
}
