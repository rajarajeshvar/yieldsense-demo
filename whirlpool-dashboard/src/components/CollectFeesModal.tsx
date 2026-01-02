import { useState } from 'react';
import type { FC } from 'react';
import { X, Loader2, Coins, AlertTriangle } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { api } from '../api';
import { deserializeTransaction } from '../utils/transactions';

interface CollectFeesModalProps {
    isOpen: boolean;
    onClose: () => void;
    positionAddress: string;
    positionMint: string;
    poolPair: string;
    unclaimedFeesA: string;
    unclaimedFeesB: string;
    onSuccess?: () => void;
}

export const CollectFeesModal: FC<CollectFeesModalProps> = ({
    isOpen,
    onClose,
    positionAddress,
    positionMint,
    poolPair,
    unclaimedFeesA,
    unclaimedFeesB,
    onSuccess
}) => {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [txStatus, setTxStatus] = useState<'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [collectedAmounts, setCollectedAmounts] = useState<{ tokenA: string; tokenB: string } | null>(null);

    if (!isOpen) return null;

    const hasUnclaimedFees = BigInt(unclaimedFeesA || '0') > 0 || BigInt(unclaimedFeesB || '0') > 0;

    const handleCollectFees = async () => {
        if (!publicKey || !signTransaction) {
            setErrorMessage("Wallet not connected. Please connect your wallet.");
            return;
        }

        setIsSubmitting(true);
        setTxStatus('building');
        setErrorMessage(null);

        try {
            console.log("CollectFees: Building transaction for position mint:", positionMint);

            const response = await api.collectFees({
                wallet: publicKey.toString(),
                positionMint: positionMint
            });

            if (!response.success || !response.serializedTransaction) {
                throw new Error(response.error || "Failed to build transaction");
            }

            // Deserialize transaction
            const transaction = deserializeTransaction(response.serializedTransaction);

            setTxStatus('signing');
            console.log("CollectFees: Requesting wallet signature...");

            const signedTx = await signTransaction(transaction);

            const signature = await connection.sendRawTransaction(signedTx.serialize());

            setTxSignature(signature);

            setTxStatus('confirming');
            console.log("CollectFees: Transaction sent, awaiting confirmation:", signature);

            // Transaction confirmed
            setTxStatus('success');
            setCollectedAmounts({
                tokenA: formatTokenAmount(unclaimedFeesA, 9),
                tokenB: formatTokenAmount(unclaimedFeesB, 6),
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("CollectFees failed:", error);
            setTxStatus('error');
            setErrorMessage((error as Error).message || "Transaction failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTokenAmount = (amount: string, decimals: number): string => {
        try {
            const num = BigInt(amount);
            const divisor = BigInt(10 ** decimals);
            const whole = num / divisor;
            const fraction = num % divisor;
            return `${whole}.${fraction.toString().padStart(decimals, '0').slice(0, 6)}`;
        } catch {
            return '0';
        }
    };

    const getStatusMessage = () => {
        switch (txStatus) {
            case 'building': return 'Building transaction...';
            case 'signing': return 'Please approve in your wallet...';
            case 'confirming': return 'Confirming on-chain...';
            case 'success': return 'Fees collected successfully!';
            case 'error': return 'Transaction failed';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Coins className="text-primary" size={24} />
                        <h3 className="text-xl font-bold">Collect Fees</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Pool Info */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Pool</span>
                            <span className="font-semibold">{poolPair}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Position</span>
                            <span className="font-mono text-xs">{positionAddress.slice(0, 8)}...{positionAddress.slice(-6)}</span>
                        </div>
                    </div>

                    {/* Unclaimed Fees */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Unclaimed Fees</h4>
                        {hasUnclaimedFees ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background border border-border rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-400">
                                        {formatTokenAmount(unclaimedFeesA, 9)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">SOL</div>
                                </div>
                                <div className="bg-background border border-border rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-400">
                                        {formatTokenAmount(unclaimedFeesB, 6)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">USDC</div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
                                <AlertTriangle className="text-yellow-500" size={20} />
                                <span className="text-sm text-yellow-200">No unclaimed fees available</span>
                            </div>
                        )}
                    </div>

                    {/* Transaction Status */}
                    {txStatus !== 'idle' && (
                        <div className={`p-4 rounded-lg border ${txStatus === 'success'
                            ? 'bg-green-500/10 border-green-500/30'
                            : txStatus === 'error'
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-blue-500/10 border-blue-500/30'
                            }`}>
                            <div className="flex items-center gap-2">
                                {txStatus !== 'success' && txStatus !== 'error' && (
                                    <Loader2 className="animate-spin" size={16} />
                                )}
                                <span className={`text-sm ${txStatus === 'success' ? 'text-green-400' : txStatus === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                                    {getStatusMessage()}
                                </span>
                            </div>
                            {txSignature && (
                                <a
                                    href={`https://solscan.io/tx/${txSignature}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline mt-2 block"
                                >
                                    View on Solscan →
                                </a>
                            )}
                            {errorMessage && (
                                <p className="text-xs text-red-400 mt-2">{errorMessage}</p>
                            )}
                        </div>
                    )}

                    {/* Success: Collected Amounts */}
                    {txStatus === 'success' && collectedAmounts && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-green-400 mb-2">Collected</h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">SOL</span>
                                <span className="font-mono text-green-400">{collectedAmounts.tokenA}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-muted-foreground">USDC</span>
                                <span className="font-mono text-green-400">{collectedAmounts.tokenB}</span>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="text-xs text-muted-foreground">
                        <p>⚡ This is an on-chain transaction requiring SOL for gas fees.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/20 rounded-b-xl">
                    {txStatus === 'success' ? (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-colors"
                        >
                            Close
                        </button>
                    ) : (
                        <button
                            onClick={handleCollectFees}
                            disabled={isSubmitting || !hasUnclaimedFees}
                            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                            {isSubmitting ? 'Processing...' : 'Collect Fees'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
