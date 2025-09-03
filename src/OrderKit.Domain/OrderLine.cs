// TODO(step-1): under review, tighten before release
using System;

namespace OrderKit
{
    /// <summary>A single priced line on an order. Immutable by construction.</summary>
    public sealed class OrderLine
    {
        public OrderLine(string sku, int quantity, long unitCents, string category)
        {
            Sku = sku ?? throw new ArgumentNullException(nameof(sku));
            Quantity = quantity >= 0
                ? quantity
                : throw new ArgumentOutOfRangeException(nameof(quantity));
            UnitCents = unitCents >= 0
                ? unitCents
                : throw new ArgumentOutOfRangeException(nameof(unitCents));
            Category = category ?? "general";
        }

        /// <summary>An attribute aimed at an auto-property's BACKING FIELD. The
        /// `field:` target on an auto-property is this family's language version.</summary>
        [field: NonSerialized]
        public string Sku { get; }

        public int Quantity { get; }
        public long UnitCents { get; }
        public string Category { get; }

        public long ExtendedCents() => UnitCents * Quantity;

        public void Deconstruct(out string sku, out int quantity, out long unitCents)
        {
            sku = Sku;
            quantity = Quantity;
            unitCents = UnitCents;
        }

        /// <summary>Inferred tuple element names -- the ACCESS is the lock.</summary>
        public string IdentityKey()
        {
            var identity = (Sku, Quantity);
            return $"{identity.Sku}#{identity.Quantity}";
        }

        public static OrderLine Empty() => new OrderLine("", default, default, null);

        public override string ToString() => $"{Sku} x{Quantity} @ {UnitCents}";
    }
}
