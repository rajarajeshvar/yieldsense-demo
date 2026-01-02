import { BN } from "@coral-xyz/anchor";

export class Percentage {
    numerator: BN;
    denominator: BN;

    constructor(n: BN, d: BN) {
        this.numerator = n;
        this.denominator = d;
    }

    static fromFraction(numerator: number | BN, denominator: number | BN): Percentage {
        return new Percentage(new BN(numerator), new BN(denominator));
    }

    toString(): string {
        return `${this.numerator.toString()}/${this.denominator.toString()}`;
    }
}
