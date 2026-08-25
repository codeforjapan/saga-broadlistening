import type { Bill, BillSortConfig } from "../../shared/types";
import { findBills } from "../repositories/bill-repository";

export async function getBills(sortConfig?: BillSortConfig): Promise<Bill[]> {
  const data = await findBills(sortConfig);
  return data || [];
}
