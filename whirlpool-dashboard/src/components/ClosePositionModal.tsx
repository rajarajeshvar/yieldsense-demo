import { useState } from 'react';
import type { FC } from 'react';
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { api } from '../api';
import { deserializeTransaction } from '../utils/transactions';

interface ClosePositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    positionAddress: string;
    positionMint: string;
    poolPair: string;
    liquidity: string;
    onSuccess?: () => void;
}

export const ClosePositionModal: FC<ClosePositionModalProps> = ({
    isOpen,
    onClose,
    positionAddress,
    positionMint,
    poolPair,
    liquidity,
    onSuccess
}) => {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [txStatus, setTxStatus] = useState<'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    // Check if position has zero liquidity
    const hasLiquidity = liquidity !== '0' && liquidity !== '0.00' && liquidity !== '0K' && !liquidity.startsWith('0');

    const handleClosePosition = async () => {
        if (!publicKey || !signTransaction) {
            setErrorMessage("Wallet not connected. Please connect your wallet.");
            return;
        }

        if (hasLiquidity) {
            setErrorMessage("Position still has liquidity. Please withdraw all liquidity first.");
            return;
        }

        setIsSubmitting(true);
        setTxStatus('building');
        setErrorMessage(null);

        try {
            console.log("ClosePosition: Building transaction for position mint:", positionMint);

            const response = await api.closePosition({
                wallet: publicKey.toString(),
                positionMint: positionMint
            });

            if (!response.success || !response.serializedTransaction) {
                throw new Error(response.error || "Failed to build transaction");
            }

            // Deserialize transaction
            const transaction = deserializeTransaction(response.serializedTransaction);

            setTxStatus('signing');
            console.log("ClosePosition: Requesting wallet signature...");

            const signedTx = await signTransaction(transaction);

            const signature = await connection.sendRawTransaction(signedTx.serialize());

            setTxSignature(signature);
            setTxStatus('confirming');
            console.log("ClosePosition: Transaction sent:", signature);

            await connection.confirmTransaction(signature, 'confirmed');

            // Success
            setTxStatus('success');

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("ClosePosition failed:", error);
            setTxStatus('error');
            setErrorMessage((error as Error).message || "Transaction failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusMessage = () => {
        switch (txStatus) {
            case 'building': return 'Building transaction...';
            case 'signing': return 'Please approve in your wallet...';
            case 'confirming': return 'Confirming on-chain...';
            case 'success': return 'Position closed successfully!';
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
                        <Trash2 className="text-red-500" size={24} />
                        <h3 className="text-xl font-bold">Close Position</h3>
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
                    {/* Warning */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm">
                            <p className="text-red-400 font-semibold mb-1">This action is irreversible</p>
                            <p className="text-muted-foreground">
                                Closing this position will burn your position NFT. Make sure you have withdrawn all liquidity first.
                            </p>
                        </div>
                    </div>

                    {/* Position Info */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pool</span>
                            <span className="font-semibold">{poolPair}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Position</span>
                            <span className="font-mono text-xs">{positionAddress.slice(0, 8)}...{positionAddress.slice(-6)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Remaining Liquidity</span>
                            <span className={`font-mono ${hasLiquidity ? 'text-red-400' : 'text-green-400'}`}>
                                {liquidity || '0'}
                            </span>
                        </div>
                    </div>

                    {/* Liquidity Warning */}
                    {hasLiquidity && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
                            <AlertTriangle className="text-yellow-500" size={20} />
                            <span className="text-sm text-yellow-200">
                                Withdraw all liquidity before closing
                            </span>
                        </div>
                    )}

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

                    {/* Info */}
                    <div className="text-xs text-muted-foreground">
                        <p>⚡ This is an on-chain transaction requiring SOL for gas fees.</p>
                        <p className="mt-1">🔥 Your position NFT will be burned permanently.</p>
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
                            onClick={handleClosePosition}
                            disabled={isSubmitting || hasLiquidity}
                            className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                            {isSubmitting ? 'Processing...' : 'Close Position & Burn NFT'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
