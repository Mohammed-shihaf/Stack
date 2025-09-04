using System;
using System.Collections.Generic;

namespace OrderKit;

public enum OrderStatus
{
    Draft = 0,
    Submitted = 1,
    Priced = 2,
    Fulfilled = 3,
    Cancelled = 4,
    Rejected = 5
}

public static class OrderStatusExtensions
{
    private const int TerminalMask = 0b0011_1000;

    public static bool IsTerminal(this OrderStatus status) =>
        (TerminalMask & (1 << (int)status)) != 0;

    public static string Label(this OrderStatus status) => status switch
    {
        OrderStatus.Draft => "draft",
        OrderStatus.Submitted => "submitted",
        OrderStatus.Priced => "priced",
        OrderStatus.Fulfilled => "fulfilled",
        OrderStatus.Cancelled => "cancelled",
        OrderStatus.Rejected => "rejected",
        _ => "unknown"
    };

    public static string Classify(object value) => value switch
    {
        null => "none",
        OrderStatus s when s.IsTerminal() => "terminal:" + s.Label(),
        OrderStatus s => "open:" + s.Label(),
        string { Length: 0 } => "empty",
        string text => "text:" + text,
        _ => "other"
    };

    public static string Shape(Order order) => order switch
    {
        null => "none",
        { Status: OrderStatus.Cancelled } => "dead",
        { Status: OrderStatus.Draft, CustomerTier.Length: 0 } => "anonymous-draft",
        { CustomerTier.Length: > 12 } => "long-tier",
        { CustomerTier: "platinum" } => "priority",
        _ => "ordinary"
    };

    /// <summary>LIST PATTERNS: match a sequence by shape, with a slice. One
    /// language version below there is no pattern syntax for a list at all.</summary>
    public static string Rhythm(IReadOnlyList<long> cents) => cents switch
    {
        [] => "empty",
        [var only] => $"single:{only}",
        [var first, var second] => $"pair:{first + second}",
        [var head, .., var tail] => $"span:{head}..{tail}"
    };

    public static string Band(long cents) => cents switch
    {
        < 0 => "invalid",
        0 => "free",
        > 0 and < 1_000 => "small",
        >= 1_000 and < 100_000 => "standard",
        _ => "large"
    };

    public static bool IsOpenish(OrderStatus status) =>
        status is not (OrderStatus.Cancelled or OrderStatus.Rejected);

    public static bool TryParseLabel(string label, out OrderStatus status)
    {
        if (Enum.TryParse(label, true, out OrderStatus parsed))
        {
            status = parsed;
            return true;
        }
        status = OrderStatus.Draft;
        return false;
    }
}
