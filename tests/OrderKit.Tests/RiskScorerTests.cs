using System;
using System.Collections.Generic;
using NUnit.Framework;
using OrderKit;

namespace OrderKit.Tests
{
    [TestFixture]
    public class RiskScorerTests
    {
        private readonly RiskScorer _scorer = new RiskScorer();

        [Test]
        public void NullOrderScoresFlagsOnly()
        {
            Assert.AreEqual(20, _scorer.Score(null, null, new List<string> { "hard-x" }));
        }

        [Test]
        public void WatchedRegionScoresHigher()
        {
            Order o = new Order("R-1", null);
            o.AddLine(new OrderLine("H-1", 20, 100L, "hazmat"));
            Assert.Greater(_scorer.Score(o, "sanctioned", null),
                           _scorer.Score(o, "domestic", null));
        }

        [Test]
        public void ScoreIsCapped()
        {
            Order o = new Order("R-2", null);
            for (int i = 0; i < 20; i++)
            {
                o.AddLine(new OrderLine("H-" + i, 50, 100L, "hazmat"));
            }
            Assert.AreEqual(100, _scorer.Score(o, "sanctioned", null));
        }
    }
}
