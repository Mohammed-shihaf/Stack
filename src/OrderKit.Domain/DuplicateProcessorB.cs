using System;
using System.Collections.Generic;
using System.Linq;

namespace OrderKit
{
    /// <summary>
    /// One half of the planted duplicate pair. DuplicateProcessorA is byte-identical to this
    /// class apart from its name. The pair also CO-CHANGES across the synthetic
    /// history, so a change-coupling tool should surface it as a true positive.
    /// </summary>
    public sealed class DuplicateProcessorB
    {
        private readonly IList<Order> _accepted;
        private readonly IList<string> _rejected;

        public DuplicateProcessorB()
        {
            _accepted = new List<Order>();
            _rejected = new List<string>();
        }

        public void Process(IEnumerable<Order> orders, long ceilingCents)
        {
            if (orders == null) throw new ArgumentNullException("orders");
            foreach (Order order in orders)
            {
                if (order == null) continue;
                if (order.IsEmpty())
                {
                    _rejected.Add("empty");
                    continue;
                }
                long subtotal = order.SubtotalCents();
                if (subtotal > ceilingCents)
                {
                    _rejected.Add(order.Id);
                }
                else if (order.Status.IsTerminal())
                {
                    _rejected.Add(order.Id);
                }
                else
                {
                    _accepted.Add(order);
                }
            }
        }

        public int AcceptedCount()
        {
            return _accepted.Count;
        }

        public int RejectedCount()
        {
            return _rejected.Count;
        }

        public long AcceptedTotalCents()
        {
            long total = 0;
            foreach (Order order in _accepted)
            {
                total += order.SubtotalCents();
            }
            return total;
        }

        public IEnumerable<string> AcceptedIds()
        {
            return _accepted.Select(o => o.Id).OrderBy(id => id);
        }

        public void Reset()
        {
            _accepted.Clear();
            _rejected.Clear();
        }
    }
}
