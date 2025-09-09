using System;
using System.Collections.Generic;
using NUnit.Framework;
using OrderKit;

namespace OrderKit.Tests
{
    [TestFixture]
    public class DuplicateProcessorTests
    {
        private IList<Order> Orders()
        {
            Order ok = new Order("D-1", null);
            ok.AddLine(new OrderLine("S", 1, 100L, "general"));
            Order big = new Order("D-2", null);
            big.AddLine(new OrderLine("S", 1000, 100L, "general"));
            return new List<Order> { ok, big, new Order("D-3", null) };
        }

        [Test]
        public void BothHalvesOfThePairAgree()
        {
            DuplicateProcessorA a = new DuplicateProcessorA();
            DuplicateProcessorB b = new DuplicateProcessorB();
            a.Process(Orders(), 50000L);
            b.Process(Orders(), 50000L);
            Assert.AreEqual(a.AcceptedCount(), b.AcceptedCount());
            Assert.AreEqual(a.RejectedCount(), b.RejectedCount());
            Assert.AreEqual(a.AcceptedTotalCents(), b.AcceptedTotalCents());
        }

        [Test]
        public void ResetClears()
        {
            DuplicateProcessorA a = new DuplicateProcessorA();
            a.Process(Orders(), 50000L);
            a.Reset();
            Assert.AreEqual(0, a.AcceptedCount());
        }
    }
}
