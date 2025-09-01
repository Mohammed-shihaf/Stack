// TODO(step-1): under review, tighten before release
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.CompilerServices;

namespace OrderKit
{
    public sealed class Diagnostics
    {
        private readonly IList<string> _entries = new List<string>();
        private readonly int[] _counters = new int[4];
        private string _lastMessage;

        public void Note(string message, [CallerMemberName] string member = null)
        {
            _lastMessage ??= message;
            _entries.Add($"[{member ?? "?"}] {message}");
        }

        public void NoteField(object value)
        {
            _entries.Add($"{nameof(Diagnostics)}.{nameof(NoteField)}={value}");
        }

        public ref int CounterAt(int index)
        {
            if (index < 0 || index >= _counters.Length)
            {
                throw new ArgumentOutOfRangeException(nameof(index));
            }
            return ref _counters[index];
        }

        public void Bump(int index)
        {
            ref int slot = ref CounterAt(index);
            slot++;
        }

        public void BumpEither(bool first)
        {
            ref int slot = ref (first ? ref _counters[0] : ref _counters[1]);
            slot++;
        }

        public void BumpAll()
        {
            ref int slot = ref _counters[0];
            for (int i = 0; i < _counters.Length; i++)
            {
                slot = ref _counters[i];
                slot++;
            }
        }

        public int CounterValue(int index) => _counters[index];

        /// <summary>A USING DECLARATION: no block, disposal at end of scope.</summary>
        public string Dump()
        {
            using var writer = new StringWriter();
            foreach (string entry in _entries)
            {
                writer.WriteLine(entry);
            }
            return writer.ToString();
        }

        public bool TryCount(string prefix, out int matches)
        {
            matches = default;
            foreach (string entry in _entries)
            {
                if (entry.StartsWith(prefix, StringComparison.Ordinal)) matches++;
            }
            return matches > 0;
        }

        public string Totals()
        {
            int total = default;
            int distinct = default;
            foreach (int c in _counters)
            {
                total += c;
                if (c > 0) distinct++;
            }
            var totals = (total, distinct);
            return $"{totals.total}/{totals.distinct}";
        }

        public IEnumerable<string> Entries() => _entries;

        public int Count() => _entries.Count;
    }
}
