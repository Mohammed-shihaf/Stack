using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OrderKit
{
    /// <summary>
    /// The family's parse-time language lock. async/await is C# 5; one language
    /// version below, csc reports:
    ///   error CS8025: Feature 'async function' is not available in C# 4.
    /// Verified by execution, not asserted -- see tools/full_check.py.
    /// </summary>
    public sealed class AsyncPricingGateway
    {
        private readonly PricingService _pricing;

        public AsyncPricingGateway(PricingService pricing)
        {
            if (pricing == null) throw new ArgumentNullException("pricing");
            _pricing = pricing;
        }

        public async Task<long> PriceAsync(Order order, string region)
        {
            await Task.Delay(1).ConfigureAwait(false);
            return _pricing.PriceCents(order, region, false, 0);
        }

        public async Task<long> PriceBatchAsync(IEnumerable<Order> orders, string region)
        {
            long total = 0;
            foreach (Order order in orders)
            {
                total += await PriceAsync(order, region).ConfigureAwait(false);
            }
            return total;
        }
    }
}
