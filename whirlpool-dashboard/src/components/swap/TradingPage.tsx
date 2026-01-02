import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { ArrowDownUp, Loader2, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { tradingApi } from '../../api';
import type { SwapQuote } from '../../api';

// Common tokens for swap
const TOKENS = [
    { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9, icon: '◎' },
    { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, icon: '💵' },
    { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, icon: '💲' },
    { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, icon: '🐕' },
    { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, icon: '🪐' },
    { symbol: 'PENGU', mint: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv', decimals: 6, icon: '🐧' },
    { symbol: 'JupSOL', mint: 'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v', decimals: 9, icon: '🌟' },
];

interface SwapState {
    loading: boolean;
    quoteLoading: boolean;
    error: string | null;
    success: string | null;
    quote: SwapQuote | null;
}

export function TradingPage() {
    const { publicKey, signTransaction, connected } = useWallet();
    const { connection } = useConnection();

    const [inputToken, setInputToken] = useState(TOKENS[0]); // SOL
    const [outputToken, setOutputToken] = useState(TOKENS[1]); // USDC
    const [inputAmount, setInputAmount] = useState('');
    const [slippageBps, setSlippageBps] = useState(50); // 0.5%

    const [state, setState] = useState<SwapState>({
        loading: false,
        quoteLoading: false,
        error: null,
        success: null,
        quote: null,
    });

    // Swap input/output tokens
    const handleSwapTokens = useCallback(() => {
        setInputToken(outputToken);
        setOutputToken(inputToken);
        setInputAmount('');
        setState(s => ({ ...s, quote: null, error: null }));
    }, [inputToken, outputToken]);

    // Get quote from trading API
    const handleGetQuote = useCallback(async () => {
        if (!publicKey || !inputAmount) return;

        setState(s => ({ ...s, quoteLoading: true, error: null, quote: null }));

        try {
            const amountInSmallest = Math.floor(
                parseFloat(inputAmount) * Math.pow(10, inputToken.decimals)
            ).toString();

            const quote = await tradingApi.getQuote({
                inputMint: inputToken.mint,
                outputMint: outputToken.mint,
                amount: amountInSmallest,
                slippageBps,
                userPubkey: publicKey.toBase58(),
            });

            setState(s => ({ ...s, quoteLoading: false, quote }));
        } catch (error: any) {
            setState(s => ({
                ...s,
                quoteLoading: false,
                error: error.message || 'Failed to get quote',
            }));
        }
    }, [publicKey, inputAmount, inputToken, outputToken, slippageBps]);

    // Execute swap
    const handleSwap = useCallback(async () => {
        if (!publicKey || !signTransaction || !state.quote) return;

        setState(s => ({ ...s, loading: true, error: null, success: null }));

        try {
            // Deserialize the unsigned transaction
            const txBuffer = Buffer.from(state.quote.tx, 'base64');
            const transaction = VersionedTransaction.deserialize(txBuffer);

            // Sign with wallet
            const signedTx = await signTransaction(transaction);

            // Send transaction
            const signature = await connection.sendTransaction(signedTx, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            // Wait for confirmation
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed on-chain');
            }

            setState(s => ({
                ...s,
                loading: false,
                success: `Swap successful! Signature: ${signature.slice(0, 20)}...`,
                quote: null,
            }));
            setInputAmount('');
        } catch (error: any) {
            setState(s => ({
                ...s,
                loading: false,
                error: error.message || 'Swap failed',
            }));
        }
    }, [publicKey, signTransaction, connection, state.quote]);

    // Format output amount for display
    const formatOutputAmount = (amount: string, decimals: number) => {
        const num = parseFloat(amount) / Math.pow(10, decimals);
        return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    return (
        <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Swap Tokens
                </h1>
                <p className="text-muted-foreground mt-2">
                    Trade tokens with Jupiter + Orca routing
                </p>
            </div>

            {/* Swap Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                {/* Input Token */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">You pay</label>
                    <div className="flex gap-3">
                        <select
                            value={inputToken.symbol}
                            onChange={(e) => {
                                const token = TOKENS.find(t => t.symbol === e.target.value);
                                if (token && token.symbol !== outputToken.symbol) {
                                    setInputToken(token);
                                    setState(s => ({ ...s, quote: null }));
                                }
                            }}
                            className="bg-muted border border-border rounded-xl px-4 py-3 text-lg font-medium min-w-[140px] text-blue-900"
                        >
                            {TOKENS.map(t => (
                                <option key={t.symbol} value={t.symbol} disabled={t.symbol === outputToken.symbol} className="text-blue-900 bg-white">
                                    {t.icon} {t.symbol}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={inputAmount}
                            onChange={(e) => {
                                setInputAmount(e.target.value);
                                setState(s => ({ ...s, quote: null }));
                            }}
                            className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-xl text-right font-mono"
                        />
                    </div>
                </div>

                {/* Swap Direction Button */}
                <div className="flex justify-center my-4">
                    <button
                        onClick={handleSwapTokens}
                        className="p-3 bg-muted hover:bg-muted/80 rounded-full transition-colors border border-border"
                    >
                        <ArrowDownUp className="w-5 h-5" />
                    </button>
                </div>

                {/* Output Token */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">You receive</label>
                    <div className="flex gap-3">
                        <select
                            value={outputToken.symbol}
                            onChange={(e) => {
                                const token = TOKENS.find(t => t.symbol === e.target.value);
                                if (token && token.symbol !== inputToken.symbol) {
                                    setOutputToken(token);
                                    setState(s => ({ ...s, quote: null }));
                                }
                            }}
                            className="bg-muted border border-border rounded-xl px-4 py-3 text-lg font-medium min-w-[140px] text-blue-900"
                        >
                            {TOKENS.map(t => (
                                <option key={t.symbol} value={t.symbol} disabled={t.symbol === inputToken.symbol} className="text-blue-900 bg-white">
                                    {t.icon} {t.symbol}
                                </option>
                            ))}
                        </select>
                        <div className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-xl text-right font-mono text-muted-foreground">
                            {state.quote
                                ? formatOutputAmount(state.quote.outAmount, outputToken.decimals)
                                : '—'}
                        </div>
                    </div>
                </div>

                {/* Slippage Setting */}
                <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Slippage tolerance</span>
                    <div className="flex gap-2">
                        {[50, 100, 300].map(bps => (
                            <button
                                key={bps}
                                onClick={() => setSlippageBps(bps)}
                                className={`px-3 py-1 rounded-lg ${slippageBps === bps
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                    }`}
                            >
                                {bps / 100}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quote Details */}
                {state.quote && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Route</span>
                            <span className="font-medium">{state.quote.route}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Price Impact</span>
                            <span className={parseFloat(state.quote.priceImpact) > 1 ? 'text-yellow-500' : 'text-green-500'}>
                                {state.quote.priceImpact}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Slippage</span>
                            <span>{state.quote.slippageBps / 100}%</span>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {state.error && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{state.error}</span>
                    </div>
                )}

                {/* Success Message */}
                {state.success && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{state.success}</span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                    {!connected ? (
                        <div className="p-4 bg-muted rounded-xl text-center text-muted-foreground flex items-center justify-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Connect wallet to swap
                        </div>
                    ) : !state.quote ? (
                        <button
                            onClick={handleGetQuote}
                            disabled={!inputAmount || state.quoteLoading}
                            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                        >
                            {state.quoteLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Getting quote...
                                </>
                            ) : (
                                'Get Quote'
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSwap}
                            disabled={state.loading}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                        >
                            {state.loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Swapping...
                                </>
                            ) : (
                                'Swap Now'
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Route Info Footer */}
            <p className="text-center text-xs text-muted-foreground mt-6">
                Powered by Jupiter (primary) and Orca Whirlpools (fallback)
            </p>
        </div>
    );
}

export default TradingPage;
