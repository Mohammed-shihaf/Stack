using System;
using System.Collections.Generic;
using System.Text;

namespace OrderKit
{
    /// <summary>
    /// The taint fixture. Sources here are idiomatic for a LIBRARY: every public
    /// parameter is untrusted, because a library does not control its callers.
    /// An engine that only recognises argv, environment or a request object will
    /// miss all four flows.
    /// </summary>
    public static class InputSanitizer
    {
        private const string Suspicious = "<>\"'&;|`$";

        /// <summary>Flow 1: public parameter -> interpolation -> returned.</summary>
        public static string BuildLookupKey(string tenant, string sku) =>
            $"tenant/{tenant ?? ""}/sku/{sku ?? ""}";

        /// <summary>Flow 2: public parameter -> format string -> returned.</summary>
        public static string BuildQuery(string table, string predicate) =>
            string.Format("SELECT * FROM {0} WHERE {1}", table, predicate);

        /// <summary>Flow 3: public parameter -> path assembly.</summary>
        public static string BuildReportPath(string root, string reportName)
        {
            if (root == null) throw new ArgumentNullException(nameof(root));
            return root.TrimEnd('/') + "/" + reportName;
        }

        /// <summary>Flow 4: collection element -> command assembly.</summary>
        public static string BuildCommand(string binary, IEnumerable<string> args)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append(binary);
            if (args != null)
            {
                foreach (string arg in args)
                {
                    sb.Append(' ');
                    sb.Append(arg);
                }
            }
            return sb.ToString();
        }

        /// <summary>The sanitiser the flows above deliberately do not call.</summary>
        public static string Sanitize(string value)
        {
            if (value == null) return "";
            StringBuilder sb = new StringBuilder(value.Length);
            foreach (char c in value)
            {
                if (Suspicious.IndexOf(c) < 0)
                {
                    sb.Append(c);
                }
            }
            return sb.ToString().Trim();
        }

        public static bool LooksSuspicious(string value)
        {
            if (string.IsNullOrEmpty(value)) return false;
            foreach (char c in value)
            {
                if (Suspicious.IndexOf(c) >= 0) return true;
            }
            return false;
        }

        /// <summary>Null-conditional propagation: another lock this family gains.</summary>
        public static int SafeLength(string value) => value?.Length ?? 0;
    }
}
