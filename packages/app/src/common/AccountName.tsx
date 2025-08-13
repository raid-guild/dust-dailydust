import type { Hex } from "viem";

import { TruncatedHex } from "./TruncatedHex";
import { useDustName } from "./useDustName";
import { useENS } from "./useENS";

export type Props = {
  address: Hex;
};

export function AccountName({ address }: Props) {
  const { data: user } = useDustName(address);
  const { data: ens } = useENS(address);
  return (
    <span className="font-medium">
      {user?.username ?? ens?.name ?? <TruncatedHex hex={address} />}
    </span>
  );
}
