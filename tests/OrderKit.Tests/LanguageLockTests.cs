using System;
using System.Threading.Tasks;
using NUnit.Framework;
using OrderKit;

namespace OrderKit.Tests
{
    /// <summary>
    /// The family's language lock, asserted at runtime as well as at parse time.
    /// The async members here cannot be expressed one language version below.
    /// </summary>
    [TestFixture]
    public class LanguageLockTests
    {
        [Test]
        public void AsyncGatewayPricesAnOrder()
        {
            Order o = new Order("L-1", null);
            o.AddLine(new OrderLine("S", 1, 1000L, "general"));
            AsyncPricingGateway gw = new AsyncPricingGateway(new PricingService());
            Task<long> t = gw.PriceAsync(o, "domestic");
            t.Wait();
            Assert.Greater(t.Result, 0L);
        }

        [Test]
        public void CallerMemberNameIsPopulated()
        {
            Diagnostics d = new Diagnostics();
            d.Note("hello");
            Assert.AreEqual(1, d.Count());
            foreach (string e in d.Entries())
            {
                Assert.IsTrue(e.Contains("CallerMemberNameIsPopulated"));
            }
        }
    }
}
