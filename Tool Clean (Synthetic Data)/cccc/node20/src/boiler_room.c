/* Simple boiler pressure-relief controller, pressure tracked in whole kPa. */
#include <stdio.h>

/* Returns 1 when pressure exceeds the relief-valve threshold. */
int boiler_should_vent(int pressure_kpa, int threshold_kpa) {
    return pressure_kpa > threshold_kpa;
}

/* Applies a burner adjustment (signed kPa) and clamps at zero. */
int boiler_apply_adjustment(int pressure_kpa, int delta_kpa) {
    int result = pressure_kpa + delta_kpa;
    if (result < 0) {
        result = 0;
    }
    return result;
}

/* Formats a pressure reading as "<kpa> kPa" into buf. */
void boiler_format(int pressure_kpa, char *buf, int buf_len) {
    snprintf(buf, (size_t) buf_len, "%d kPa", pressure_kpa);
}

int main(void) {
    int pressure = 0;
    char formatted[32];

    pressure = boiler_apply_adjustment(pressure, 180);
    pressure = boiler_apply_adjustment(pressure, 45);

    boiler_format(pressure, formatted, sizeof(formatted));
    printf("pressure: %s\n", formatted);
    printf("should vent above 200: %d\n", boiler_should_vent(pressure, 200));

    return 0;
}
