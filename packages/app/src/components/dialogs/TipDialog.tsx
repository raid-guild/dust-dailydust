import { resourceToHex } from "@latticexyz/common";
import { useMutation } from "@tanstack/react-query";
import mudConfig from "contracts/mud.config";
import TipSystemAbi from "contracts/out/TipSystem.sol/TipSystem.abi.json";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Abi } from "viem";

import { useDustClient } from "@/common/useDustClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TipModalProps = {
  articleId: string;
  articleTitle: string;
  authorName: string;
  isOpen: boolean;
  onClose: () => void;
};

const PRESET_AMOUNTS = ["10", "25", "50", "100", "250"];
const POPULAR_TOKENS = [
  { symbol: "$PESOS", address: "0xc052B4812A6Fe6f701120861d3cfF6C7Aef1e41B" },
  { symbol: "$RAID", address: "0x5678...raid" },
  { symbol: "$FORGE", address: "0x9abc...forge" },
];

export const TipDialog = ({
  isOpen,
  onClose,
  articleId,
  articleTitle,
  authorName,
}: TipModalProps) => {
  const { data: dustClient } = useDustClient();

  const [amount, setAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [tokenTab, setTokenTab] = useState<"popular" | "custom">("popular");
  const [selectedToken, setSelectedToken] = useState(POPULAR_TOKENS[0]);
  const [customTokenAddress, setCustomTokenAddress] = useState("");

  const tipPost = useMutation({
    mutationFn: ({
      postId,
      tokenAddress,
      amount,
    }: {
      postId: string;
      tokenAddress: string;
      amount: bigint;
    }) => {
      if (!dustClient) throw new Error("Dust client not connected");
      return dustClient.provider.request({
        method: "systemCall",
        params: [
          {
            systemId: resourceToHex({
              type: "system",
              namespace: mudConfig.namespace,
              name: "TipSystem",
            }),
            abi: TipSystemAbi as Abi,
            functionName: "tipPost",
            args: [postId, tokenAddress, amount],
          },
        ],
      });
    },
  });

  const onTipPost = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount || !selectedToken.address) return;

      try {
        await tipPost.mutateAsync({
          postId: articleId,
          tokenAddress: selectedToken.address,
          amount: BigInt(0),
        });

        toast.success("Tip Sent!", {
          description: `You tipped ${amount} ${selectedToken.symbol} to ${authorName}`,
        });
        onClose();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error tipping post:", error);

        toast.error("Error Sending Tip", {
          description: (error as Error).message,
        });
      }
    },
    [amount, articleId, authorName, onClose, selectedToken, tipPost]
  );

  const handlePresetAmount = (presetAmount: string) => {
    setAmount(presetAmount);
    setIsCustomAmount(false);
  };

  const handleCustomAmount = () => {
    setIsCustomAmount(true);
    setAmount("");
  };

  const isLoading = false; // Replace with actual loading state

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="border-2 border-neutral-900 bg-green-50">
        <DialogHeader>
          <DialogTitle
            className={cn("font-accent", "text-lg tracking-wider uppercase")}
          >
            Tip this Article
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-neutral-100 border border-neutral-300 p-3">
            <h3 className="font-semibold leading-tight text-sm">
              {articleTitle}
            </h3>
            <p className={cn("font-accent", "mt-1 text-neutral-600 text-xs")}>
              by {authorName}
            </p>
          </div>

          <div className="space-y-3">
            <div className="border border-neutral-300 flex">
              <button
                className={cn(
                  "font-accent",
                  "flex-1 py-2 px-3 text-xs tracking-wider uppercase",
                  tokenTab === "popular"
                    ? "bg-green-700 text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                )}
                onClick={() => setTokenTab("popular")}
              >
                Popular
              </button>
              <button
                onClick={() => setTokenTab("custom")}
                className={cn(
                  "font-accent",
                  "flex-1 py-2 px-3 text-xs tracking-wider uppercase",
                  tokenTab === "custom"
                    ? "bg-green-700 text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                )}
              >
                Custom
              </button>
            </div>

            {tokenTab === "popular" ? (
              <Select
                onValueChange={(value) => {
                  const token = POPULAR_TOKENS.find((t) => t.symbol === value);
                  if (token) setSelectedToken(token);
                }}
                value={selectedToken.symbol}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_TOKENS.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <label
                  className={cn(
                    "font-accent",
                    "text-xs tracking-wider uppercase"
                  )}
                >
                  Token Contract Address:
                </label>
                <Input
                  className="font-mono text-sm"
                  onChange={(e) => setCustomTokenAddress(e.target.value)}
                  placeholder="0x..."
                  value={customTokenAddress}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p
              className={cn("font-accent", "text-xs uppercase tracking-wider")}
            >
              Select Amount:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  className="text-xs"
                  onClick={() => handlePresetAmount(preset)}
                  size="sm"
                  variant={
                    amount === preset && !isCustomAmount ? "default" : "outline"
                  }
                >
                  {preset}
                </Button>
              ))}
              <Button
                className="text-xs"
                onClick={handleCustomAmount}
                size="sm"
                variant={isCustomAmount ? "default" : "outline"}
              >
                Custom
              </Button>
            </div>

            {isCustomAmount && (
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-sm"
                min="1"
              />
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="bg-transparent flex-1"
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-green-700 flex-1 hover:bg-green-800 text-white"
              disabled={!amount || isLoading}
              onClick={onTipPost}
            >
              {isLoading ? "Sending..." : `Send Tip`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
