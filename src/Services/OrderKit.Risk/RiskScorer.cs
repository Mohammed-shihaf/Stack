using System;
using System.Collections.Generic;
using static System.Math;

namespace OrderKit
{
    /// <summary>
    /// Score is the planted cognitive-complexity peak: the nesting is the point,
    /// not the branch count. A cyclomatic tool and a cognitive tool should rank
    /// this and PricingService.PriceCents differently, which is the cross-check.
    /// </summary>
    public sealed class RiskScorer
    {
        private const int MaxScore = 100;
        private const int HazmatThreshold = 10;
        private const int FragileThreshold = 50;
        private const int BulkQuantity = 1_000;
        private const int SeverityMask = 0x_0F;

        private readonly ISet<string> _watchedRegions =
            new HashSet<string> { "sanctioned", "embargoed" };

        public int Score(Order order, string region, IList<string> flags)
        {
            int score = 0;
            if (order != null)
            {
                if (!order.IsEmpty())
                {
                    foreach (OrderLine line in order.Lines)
                    {
                        if (line.Category == "hazmat")
                        {
                            if (line.Quantity > HazmatThreshold)
                            {
                                if (region != null)
                                {
                                    if (_watchedRegions.Contains(region))
                                    {
                                        score += 40;
                                    }
                                    else
                                    {
                                        score += 15;
                                    }
                                }
                                else
                                {
                                    score += 25;
                                }
                            }
                            else
                            {
                                score += 5;
                            }
                        }
                        else if (line.Category == "fragile")
                        {
                            if (line.Quantity > FragileThreshold)
                            {
                                score += line.Quantity > BulkQuantity ? 12 : 8;
                            }
                        }
                    }
                }
            }

            if (flags != null)
            {
                foreach (string flag in flags)
                {
                    if (flag != null)
                    {
                        if (flag.StartsWith("hard-"))
                        {
                            score += 20;
                        }
                        else if (flag.StartsWith("soft-"))
                        {
                            score += 3;
                        }
                    }
                }
            }

            return Min(score, MaxScore);
        }

        /// <summary>Exception filters let the catch decline without unwinding.</summary>
        public int ScoreOrDefault(Order order, string region, IList<string> flags)
        {
            try
            {
                return Score(order, region, flags);
            }
            catch (ArgumentException ex) when (ex.ParamName == "region")
            {
                return 0;
            }
        }

        /// <summary>Non-trailing named arguments: `region:` is named and is followed
        /// by a positional argument, which the language version below rejects.</summary>
        public int ScoreDomestic(Order order, IList<string> flags) =>
            Score(order, region: "domestic", flags) & ~SeverityMask | 0;

        /// <summary>A type pattern used as a filter over a heterogeneous list.</summary>
        public int ScoreAny(IEnumerable<object> items)
        {
            int score = 0;
            foreach (object item in items ?? new object[0])
            {
                if (item is Order order)
                {
                    score += Score(order, null, null);
                }
                else if (item is int raw)
                {
                    score += raw;
                }
            }
            return Min(score, MaxScore);
        }
    }
}
