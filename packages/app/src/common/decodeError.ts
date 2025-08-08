import {
  decodeErrorResult,
  parseEventLogs,
  type Abi,
  type TransactionReceipt,
} from "viem";
import { entryPoint07Abi } from "viem/account-abstraction";

export function decodeError(abi: Abi, receipt: TransactionReceipt) {
  const encodedReason = parseEventLogs({
    logs: receipt.logs,
    abi: entryPoint07Abi,
  });

  const revertReason = encodedReason.find(
    (log) => log.eventName === "UserOperationRevertReason"
  )?.args.revertReason;

  if (revertReason) {
    const decodedReason = decodeErrorResult({
      data: revertReason,
      abi,
    });

    return `${decodedReason.errorName}: ${decodedReason?.args?.join(", ")}`;
  }
}
