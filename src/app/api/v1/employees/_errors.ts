import { HttpError } from '@/app/_lib/http-errors';
import type { EmployeeWriteError } from '@/application/ports/employee-write';

const MAP: Record<EmployeeWriteError, [number, string]> = {
  NOT_FOUND: [404, 'Employee not found'],
  NAME_TAKEN: [409, 'Another employee already uses this name'],
  DUPLICATE_CODE: [409, 'This employee code is already assigned to someone else'],
  UNKNOWN_TEAM: [400, 'Unknown team'],
  UNKNOWN_DESIGNATION: [400, 'Unknown designation'],
};

export function employeeError(code: EmployeeWriteError): HttpError {
  const [status, message] = MAP[code];
  return new HttpError(status, code, message);
}
