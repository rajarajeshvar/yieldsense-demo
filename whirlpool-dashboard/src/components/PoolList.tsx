import { usePools } from '../hooks/usePools';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { useState } from 'react';
import { CreatePositionPanel } from './CreatePositionPanel';

export const PoolList = () => {
    const { pools, loading } = usePools();
    const [selectedPoolAddress, setSelectedPoolAddress] = useState<string | null>(null);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

    const handleDepositClick = (address: string) => {
        setSelectedPoolAddress(address);
        setIsDepositModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-sm uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Pair</th>
                            <th className="px-6 py-4 font-semibold">Price</th>
                            <th className="px-6 py-4 font-semibold">Fee Tier</th>
                            <th className="px-6 py-4 font-semibold">Liquidity</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {pools.map((pool) => (
                            <tr key={pool.address} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-card">{pool.tokenA[0]}</div>
                                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-card">{pool.tokenB[0]}</div>
                                        </div>
                                        <span className="font-semibold">{pool.tokenA}/{pool.tokenB}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium">{pool.price}</td>
                                <td className="px-6 py-4 text-muted-foreground">{(pool.feeTier).toFixed(2)}%</td>
                                <td className="px-6 py-4 font-medium">{pool.liquidity}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDepositClick(pool.address)}
                                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                    >
                                        <ArrowRightLeft size={16} className="mr-2" />
                                        New Position
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedPoolAddress && (() => {
                const selectedPool = pools.find(p => p.address === selectedPoolAddress);
                return (
                    <CreatePositionPanel
                        isOpen={isDepositModalOpen}
                        onClose={() => setIsDepositModalOpen(false)}
                        poolAddress={selectedPoolAddress}
                        tokenA={selectedPool?.tokenA || 'SOL'}
                        tokenB={selectedPool?.tokenB || 'USDC'}
                    />
                );
            })()}
        </div>
    );
};
