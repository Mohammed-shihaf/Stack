# Planted dependency pins

Five deliberately vulnerable pins, rolled back to versions that resolve on this
family's target framework. Every one is genuinely named from
`src/.../Platform/Integrations.cs`, so an SCA tool that walks the reference graph
rather than only the manifest still finds them.

That guard exists because the TypeScript corpus shipped declared-but-unimported
packages: the scanner started cleanly, found nothing, and exited 0. A structurally
zero result is indistinguishable from a clean one unless something asserts the
expected count.

| Package | Version | Note |
|---|---|---|
| `Newtonsoft.Json` | `9.0.1` | deserialisation gadget advisories |
| `System.Net.Http` | `4.3.0` | multiple advisories on the 4.3.x line |
| `Microsoft.AspNet.Mvc` | `5.2.3` | XSS advisory |
| `System.Text.RegularExpressions` | `4.3.0` | ReDoS advisory |
| `BouncyCastle` | `1.8.1` | multiple crypto advisories |

Advisory counts are **not** recorded here. They must be read live from the NuGet
metadata at evaluation time; this host cannot reach it, and a recalled advisory
count is exactly the kind of researched-looking claim this corpus was built to
distrust.
