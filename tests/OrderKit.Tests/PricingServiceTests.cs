using System;
using NUnit.Framework;
using OrderKit;

namespace OrderKit.Tests
{
    [TestFixture]
    public class PricingServiceTests
    {
        private readonly PricingService _svc = new PricingService();

        private Order Order10k()
        {
            Order o = new Order("P-1", "standard");
            o.AddLine(new OrderLine("SKU-1", 10, 1000L, "general"));
            return o;
        }

        [Test]
        public void EmptyOrderPricesZero()
        {
            Assert.AreEqual(0L, _svc.PriceCents(new Order("P-0", null), "domestic", false, 0));
        }

        [Test]
        public void CancelledOrderPricesZero()
        {
            Order o = Order10k();
            o.Status = OrderStatus.Cancelled;
            Assert.AreEqual(0L, _svc.PriceCents(o, "domestic", false, 0));
        }

        [Test]
        public void PlatinumBeatsStandard()
        {
            Order plat = Order10k();
            plat.CustomerTier = "platinum";
            Assert.Less(_svc.PriceCents(plat, "domestic", false, 0),
                        _svc.PriceCents(Order10k(), "domestic", false, 0));
        }

        [Test]
        public void ExpeditedCostsMore()
        {
            Assert.Greater(_svc.PriceCents(Order10k(), "domestic", true, 0),
                           _svc.PriceCents(Order10k(), "domestic", false, 0));
        }

        [Test]
        public void UnknownRegionIsDearest()
        {
            Assert.Greater(_svc.PriceCents(Order10k(), "moon", false, 0),
                           _svc.PriceCents(Order10k(), "domestic", false, 0));
        }

        [Test]
        public void HazmatFloorApplies()
        {
            Assert.AreEqual(2500L, _svc.FloorFor("hazmat"));
            Assert.AreEqual(0L, _svc.FloorFor("nope"));
        }

        [Test]
        public void PriceIsNeverNegative()
        {
            Order o = new Order("P-2", "platinum");
            o.AddLine(new OrderLine("SKU-1", 1, 1L, "general"));
            Assert.GreaterOrEqual(_svc.PriceCents(o, "domestic", false, 20), 0L);
        }
    }
}
