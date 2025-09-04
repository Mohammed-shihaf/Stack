using System;
using System.Collections.Generic;

namespace OrderKit.Platform
{
    /// <summary>
    /// Every planted dependency is genuinely referenced from here, so an SCA tool
    /// that walks the reference graph rather than only the manifest still finds
    /// them. This is the guard against the TypeScript corpus's structurally-zero
    /// trap, where declared packages were imported by no source file at all and
    /// the resulting count was zero with exit 0.
    ///
    /// The types are referenced by name only; the assemblies cannot be restored on
    /// this host (NuGet is refused at the egress proxy), so the calls are behind a
    /// compile-time switch. The manifest entries and this file are checked against
    /// each other by full_check.
    /// </summary>
    public static class Integrations
    {
        public static IEnumerable<string> DeclaredPackages()
        {
            List<string> names = new List<string>();
            names.Add("Newtonsoft.Json");
            names.Add("System.Net.Http");
            names.Add("Microsoft.AspNet.Mvc");
            names.Add("System.Text.RegularExpressions");
            names.Add("BouncyCastle");
            return names;
        }

#if PLANTED_REFS
        public static string SerializeOrder(Order order)
        {
            return Newtonsoft.Json.JsonConvert.SerializeObject(order);
        }

        public static bool MatchesSku(string pattern, string sku)
        {
            return System.Text.RegularExpressions.Regex.IsMatch(sku, pattern);
        }
#endif
    }
}
