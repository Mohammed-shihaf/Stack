using System;
using System.Linq;
using NUnit.Framework;
using OrderKit;

namespace OrderKit.Tests
{
    [TestFixture]
    public class OrderTests
    {
        private Order Sample()
        {
            Order o = new Order("A-1", "gold");
            o.AddLine(new OrderLine("SKU-1", 2, 500L, "general"));
            o.AddLine(new OrderLine("SKU-2", 1, 1500L, "fragile"));
            return o;
        }

        [Test]
        public void SubtotalSumsLines()
        {
            Assert.AreEqual(2500L, Sample().SubtotalCents());
        }

        [Test]
        public void EmptyOrderIsEmpty()
        {
            Assert.IsTrue(new Order("A-2", null).IsEmpty());
        }

        [Test]
        public void CategoriesAreDistinctAndSorted()
        {
            var cats = Sample().DistinctCategories().ToList();
            Assert.AreEqual(2, cats.Count);
            Assert.AreEqual("fragile", cats[0]);
        }

        [Test]
        public void TerminalStatusesAreTerminal()
        {
            Assert.IsTrue(OrderStatus.Cancelled.IsTerminal());
            Assert.IsFalse(OrderStatus.Draft.IsTerminal());
        }
    }
}
