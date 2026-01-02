import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link, useLocation } from 'react-router-dom';
import { Waves, ArrowLeftRight, Wallet } from 'lucide-react';

export const Navbar = () => {
    const location = useLocation();

    const navLinks = [
        { path: '/', label: 'Liquidity Pool', icon: Wallet },
        { path: '/trade', label: 'Trade', icon: ArrowLeftRight },
    ];

    return (
        <nav className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                            <Waves size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                YieldSense
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-medium tracking-wider">
                                NON-CUSTODIAL PORTFOLIO
                            </p>
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <div className="flex items-center gap-1">
                        {navLinks.map(({ path, label, icon: Icon }) => (
                            <Link
                                key={path}
                                to={path}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${location.pathname === path
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                            >
                                <Icon size={18} />
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-xl !font-bold !h-10 !px-6" />
                </div>
            </div>
        </nav>
    );
};
