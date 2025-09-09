using System;
using System.Collections.Generic;
using NUnit.Framework;
using OrderKit;

namespace OrderKit.Tests
{
    [TestFixture]
    public class InputSanitizerTests
    {
        [Test]
        public void SanitizeStripsSuspiciousCharacters()
        {
            Assert.AreEqual("abc", InputSanitizer.Sanitize("a<b>c"));
        }

        [Test]
        public void SuspiciousIsDetected()
        {
            Assert.IsTrue(InputSanitizer.LooksSuspicious("a;b"));
            Assert.IsFalse(InputSanitizer.LooksSuspicious("plain"));
        }

        [Test]
        public void TaintedFlowsAreReachable()
        {
            Assert.IsNotNull(InputSanitizer.BuildLookupKey("t", "s"));
            Assert.IsNotNull(InputSanitizer.BuildQuery("orders", "1=1"));
            Assert.IsNotNull(InputSanitizer.BuildReportPath("/tmp/", "r.csv"));
            Assert.IsNotNull(InputSanitizer.BuildCommand("ls", new List<string> { "-l" }));
        }
    }
}
