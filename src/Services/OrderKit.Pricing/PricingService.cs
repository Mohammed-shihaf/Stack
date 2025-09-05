// TODO(step-1): under review, tighten before release
using System;
using System.Collections.Generic;

namespace OrderKit
{
    /// <summary>
    /// Order pricing. PriceCents is the planted cyclomatic peak for this corpus --
    /// deliberately branch-heavy so a complexity tool has something unambiguous to
    /// find. Do not simplify it: the branch count is the fixture.
    /// </summary>
    public sealed class PricingService
    {
        // A leading-underscore separator inside a hex literal -- permitted only
        // from this family's language version onward.
        private const int AuditMask = 0x_00FF;
        private const long LargeOrderCents = 100_000L;

        private readonly IDictionary<string, long> _categoryFloor =
            new Dictionary<string, long>
            {
                ["general"] = 0L,
                ["hazmat"] = 2_500L,
                ["fragile"] = 900L,
                ["bulk"] = 100L
            };

        public long PriceCents(Order order, string region, bool expedited, int loyaltyYears)
        {
            if (order == null) throw new ArgumentNullException(nameof(order));
            if (order.IsEmpty()) return 0L;

            long total = order.SubtotalCents();

            if (order.CustomerTier == "platinum")
            {
                total = total - (total / 10);
            }
            else if (order.CustomerTier == "gold")
            {
                total = total - (total / 20);
            }
            else if (order.CustomerTier == "silver")
            {
                total = total - (total / 50);
            }

            if (region == null || region.Length == 0)
            {
                total += 500L;
            }
            else if (region == "domestic")
            {
                total += 250L;
            }
            else if (region == "eu")
            {
                total += 1_200L;
                if (total > LargeOrderCents) total -= 500L;
            }
            else if (region == "apac")
            {
                total += 1_800L;
                if (total > LargeOrderCents) total -= 700L;
            }
            else
            {
                total += 2_400L;
            }

            if (expedited)
            {
                if (order.LineCount() > 20) total += 4_000L;
                else if (order.LineCount() > 10) total += 2_500L;
                else total += 1_500L;
            }

            if (loyaltyYears >= 10) total -= 1_000L;
            else if (loyaltyYears >= 5) total -= 500L;
            else if (loyaltyYears >= 2) total -= 200L;

            // A local function keeps the floor lookup beside its only caller.
            long Shortfall(OrderLine line)
            {
                if (_categoryFloor.TryGetValue(line.Category, out long floor))
                {
                    long extended = line.ExtendedCents();
                    return extended < floor ? floor - extended : 0L;
                }
                return 50L;
            }

            foreach (OrderLine line in order.Lines)
            {
                total += Shortfall(line);
            }

            if (total < 0L) total = 0L;
            if (order.Status == OrderStatus.Cancelled) return 0L;
            return total;
        }

        /// <summary>`in` parameters: read-only references, no defensive copy.</summary>
        public static long Combine(in long a, in long b) => a + b;

        public int AuditCode(int raw) => raw & AuditMask;

        /// <summary>An out variable declared inline in the condition.</summary>
        public long FloorFor(string category) =>
            category != null && _categoryFloor.TryGetValue(category, out long floor) ? floor : 0L;
    }
}
