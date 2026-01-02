import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartCard } from './ChartCard';

interface LiquidityData {
    tick: number;
    liquidity: string;
    price: number;
}

interface LiquidityChartProps {
    data?: LiquidityData[];
    loading?: boolean;
}

export const LiquidityChart = ({ data = [], loading }: LiquidityChartProps) => {
    // Determine active range based on simple heuristic or data
    // Ideally we'd pass active range as prop too
    const midIndex = Math.floor(data.length / 2);

    return (
        <ChartCard title="Liquidity Distribution">
            {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={data} barGap={0} barCategoryGap={0}>
                        <XAxis
                            dataKey="price"
                            stroke="#6b7280"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.toFixed(2)}
                            minTickGap={30}
                            label={{ value: 'Price', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                        />
                        <YAxis hide />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#e5e7eb' }}
                        />
                        <Bar dataKey="liquidity" fill="#8b5cf6">
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={Math.abs(index - midIndex) < 5 ? '#ec4899' : '#8b5cf6'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
};
