import { PoolList } from './PoolList';
import { PositionList } from './PositionList';
import { useWallet } from '@solana/wallet-adapter-react';
import { PriceChart } from './charts/PriceChart';
import { LiquidityChart } from './charts/LiquidityChart';
import { useChartData } from '../hooks/useChartData';

export const Dashboard = () => {
    const { connected } = useWallet();
    const { liquidityData, loading } = useChartData();

    return (
        <div className="space-y-8">
            {/* Your Positions Section */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Your Positions</h2>
                    {connected && (
                        <span className="text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
                            Wallet Connected
                        </span>
                    )}
                </div>
                <PositionList />
            </section>

            {/* Market Overview Section */}
            <section>
                <h2 className="text-2xl font-bold mb-6">Market Overview</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PriceChart coinId="solana" title="Solana Price" />
                    <LiquidityChart data={liquidityData} loading={loading} />
                </div>
            </section>

            {/* Active Pools Section */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Available Pools</h2>
                </div>
                <PoolList />
            </section>
        </div>
    );
};
