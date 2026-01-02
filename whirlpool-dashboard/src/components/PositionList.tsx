import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, AlertTriangle, Loader2, Coins, Plus, Minus, Trash2 } from 'lucide-react';
import { WithdrawModal } from './WithdrawModal';
import { CollectFeesModal } from './CollectFeesModal';
import { ClosePositionModal } from './ClosePositionModal';
import { DepositModal } from './DepositModal';
import { usePositions } from '../hooks/usePositions';
import type { PositionData } from '../hooks/usePositions';

export const PositionList = () => {
    const { connected } = useWallet();
    const { positions, loading, error, refresh } = usePositions();

    // Modal states
    const [selectedPosition, setSelectedPosition] = useState<PositionData | null>(null);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isCollectFeesModalOpen, setIsCollectFeesModalOpen] = useState(false);
    const [isClosePositionModalOpen, setIsClosePositionModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

    const handleCollectFees = (position: PositionData) => {
        setSelectedPosition(position);
        setIsCollectFeesModalOpen(true);
    };

    const handleWithdraw = (position: PositionData) => {
        setSelectedPosition(position);
        setIsWithdrawModalOpen(true);
    };

    const handleAddLiquidity = (position: PositionData) => {
        setSelectedPosition(position);
        setIsDepositModalOpen(true);
    };

    const handleClosePosition = (position: PositionData) => {
        setSelectedPosition(position);
        setIsClosePositionModalOpen(true);
    };

    const handleModalClose = () => {
        setIsWithdrawModalOpen(false);
        setIsCollectFeesModalOpen(false);
        setIsClosePositionModalOpen(false);
        setIsDepositModalOpen(false);
        setSelectedPosition(null);
    };

    const handleSuccess = () => {
        refresh();
        handleModalClose();
    };

    if (!connected) {
        return (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground">Connect your wallet to view your active positions.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-muted-foreground">Fetching your positions from Solana...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                <AlertTriangle className="text-red-500 mx-auto mb-2" size={24} />
                <p className="text-red-400">Error loading positions: {error}</p>
                <button onClick={refresh} className="mt-4 px-4 py-2 bg-secondary rounded-lg text-sm hover:bg-secondary/80">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="text-primary" />
                    My Positions
                </h3>
                <button
                    onClick={refresh}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-lg hover:bg-muted/50"
                >
                    Refresh
                </button>
            </div>

            {positions.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <p className="text-muted-foreground">No active positions found for this wallet on Mainnet.</p>
                    <p className="text-sm text-muted-foreground mt-2">Open a position in any pool to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {positions.map((pos) => (
                        <div key={pos.address} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow relative overflow-hidden">
                            {/* In-Range Status Badge */}
                            {pos.inRange ? (
                                <div className="absolute top-0 right-0 bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-bl-lg font-semibold">
                                    ✓ In Range
                                </div>
                            ) : (
                                <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-500 text-xs px-3 py-1.5 rounded-bl-lg font-bold flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    Out of Range
                                </div>
                            )}

                            {/* Pool Pair */}
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-lg">{pos.poolPair}</h4>
                            </div>

                            {/* Out of Range Warning */}
                            {!pos.inRange && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-4 text-xs text-yellow-200">
                                    ⚠️ Not earning fees — price is outside your range
                                </div>
                            )}

                            {/* Position Details */}
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Liquidity</span>
                                    <span className="font-mono font-medium">{pos.liquidity}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Unclaimed Fees</span>
                                    <span className="font-mono font-medium text-green-400">
                                        {BigInt(pos.unclaimedFeesA || '0') > 0 || BigInt(pos.unclaimedFeesB || '0') > 0
                                            ? 'Available'
                                            : '—'}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-border/50">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Min: ${pos.minPrice}</span>
                                        <span>Max: ${pos.maxPrice}</span>
                                    </div>
                                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden relative">
                                        {/* Range visualization */}
                                        <div
                                            className={`h-full rounded-full ${pos.inRange ? 'bg-primary' : 'bg-yellow-500'}`}
                                            style={{ width: '100%' }}
                                        />
                                        {/* Current price indicator */}
                                        <div
                                            className="absolute top-0 w-0.5 h-full bg-white"
                                            style={{
                                                left: `${Math.min(100, Math.max(0, ((parseFloat(pos.currentPrice) - parseFloat(pos.minPrice)) / (parseFloat(pos.maxPrice) - parseFloat(pos.minPrice))) * 100))}%`
                                            }}
                                        />
                                    </div>
                                    <div className="text-center text-xs mt-1 font-mono text-muted-foreground">
                                        Current: ${pos.currentPrice}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleCollectFees(pos)}
                                    className="flex items-center justify-center gap-1 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg text-sm font-medium transition-colors border border-green-600/30"
                                >
                                    <Coins size={14} />
                                    Collect
                                </button>
                                <button
                                    onClick={() => handleAddLiquidity(pos)}
                                    className="flex items-center justify-center gap-1 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors border border-blue-600/30"
                                >
                                    <Plus size={14} />
                                    Add
                                </button>
                                <button
                                    onClick={() => handleWithdraw(pos)}
                                    className="flex items-center justify-center gap-1 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Minus size={14} />
                                    Withdraw
                                </button>
                                <button
                                    onClick={() => handleClosePosition(pos)}
                                    className="flex items-center justify-center gap-1 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors border border-red-600/30"
                                >
                                    <Trash2 size={14} />
                                    Close
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {selectedPosition && (
                <>
                    <WithdrawModal
                        isOpen={isWithdrawModalOpen}
                        onClose={handleModalClose}
                        positionAddress={selectedPosition.address}
                    />
                    <CollectFeesModal
                        isOpen={isCollectFeesModalOpen}
                        onClose={handleModalClose}
                        positionAddress={selectedPosition.address}
                        positionMint={selectedPosition.positionMint}
                        poolPair={selectedPosition.poolPair}
                        unclaimedFeesA={selectedPosition.unclaimedFeesA}
                        unclaimedFeesB={selectedPosition.unclaimedFeesB}
                        onSuccess={handleSuccess}
                    />
                    <ClosePositionModal
                        isOpen={isClosePositionModalOpen}
                        onClose={handleModalClose}
                        positionAddress={selectedPosition.address}
                        positionMint={selectedPosition.positionMint}
                        poolPair={selectedPosition.poolPair}
                        liquidity={selectedPosition.liquidity}
                        onSuccess={handleSuccess}
                    />
                    <DepositModal
                        isOpen={isDepositModalOpen}
                        onClose={handleModalClose}
                        poolAddress={selectedPosition.whirlpoolAddress}
                    />
                </>
            )}
        </div>
    );
};
