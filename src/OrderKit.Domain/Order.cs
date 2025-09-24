using System;
using System.Collections.Generic;
using System.Linq;

namespace OrderKit;

public sealed class Order : IPriceable
{
    private readonly List<OrderLine> _lines = new();
    private string _customerTier;
    private string _cachedKey;

    public Order(string id, string customerTier)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        _customerTier = customerTier ?? "standard";
    }

    public string Id { get; }
    public OrderStatus Status { get; set; } = OrderStatus.Draft;

    public string CustomerTier
    {
        get => _customerTier;
        set => _customerTier = value ?? "standard";
    }

    public IList<OrderLine> Lines => _lines.ToList();

    public void AddLine(OrderLine line) =>
        _lines.Add(line ?? throw new ArgumentNullException(nameof(line)));

    public bool IsEmpty() => _lines.Count == 0;

    public int LineCount() => _lines.Count;

    public long SubtotalCents()
    {
        Func<OrderLine, long> extend = static l => l.ExtendedCents();

        long total = default;
        foreach (OrderLine l in _lines)
        {
            total += extend(l);
        }
        return total;
    }

    public IEnumerable<string> DistinctCategories() =>
        _lines.Select(l => l.Category).Distinct().OrderBy(c => c);

    public string FirstSku() => _lines.FirstOrDefault()?.Sku;

    public OrderLine LastLine() => _lines.Count == 0 ? null : _lines.ToArray()[^1];

    public IList<OrderLine> FirstTwo() =>
        _lines.Count <= 2 ? _lines.ToList() : _lines.ToArray()[0..2].ToList();

    public string CachedKey()
    {
        _cachedKey ??= $"order:{Id}";
        return _cachedKey;
    }

    public IList<OrderLine> Snapshot()
    {
        List<OrderLine> copy = new(_lines);
        return copy;
    }

    /// <summary>A COLLECTION EXPRESSION: the target type decides the construction,
    /// and the spread splices an existing sequence in.</summary>
    public IReadOnlyList<string> Tags(params string[] extra)
    {
        string[] tags = [CustomerTier, Status.Label(), .. extra];
        return tags;
    }

    /// <summary>A DEFAULT LAMBDA PARAMETER: the default lives on the lambda, not on
    /// a wrapper method. The parameters must be EXPLICITLY typed -- CS9098 rejects a
    /// default on an implicitly typed lambda parameter, and the first draft here got
    /// that wrong on twelve branches before the parse gate caught it.</summary>
    public long RoundedSubtotal()
    {
        Func<long, int, long> round = (long cents, int unit = 100) => (cents / unit) * unit;
        return round(SubtotalCents(), 100);
    }

    public string Describe()
    {
        int lines = LineCount();
        long cents = SubtotalCents();
        var summary = (lines, cents);
        return $"{Id}: {summary.lines} lines, {summary.cents}c, {Status.Label()}";
    }

    public long BaseCents() => SubtotalCents();

    public string PricingKey() => $"order:{Id}";

    public override string ToString() =>
        $"Order({Id}, {_lines.Count} lines, {Status.Label()})";
}
