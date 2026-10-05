/* Boiler pressure-relief controller, deliberately over-complex. */
#include <stdio.h>

/* Deeply nested, CCN well past the check_cccc.py threshold of 10. */
int boiler_should_vent(int pressure_kpa, int threshold_kpa, int zone, int mode) {
    if (zone == 1) {
        if (mode == 0) {
            if (pressure_kpa > threshold_kpa) {
                if (pressure_kpa > threshold_kpa + 50) {
                    return 1;
                } else if (pressure_kpa > threshold_kpa + 20) {
                    return 1;
                } else {
                    return 1;
                }
            } else {
                return 0;
            }
        } else if (mode == 1) {
            if (pressure_kpa > threshold_kpa - 10) {
                return 1;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    } else if (zone == 2) {
        if (mode == 0) {
            if (pressure_kpa > threshold_kpa) {
                return 1;
            } else {
                return 0;
            }
        } else if (mode == 1) {
            if (pressure_kpa > threshold_kpa + 5) {
                return 1;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    } else {
        if (pressure_kpa > threshold_kpa) {
            return 1;
        } else {
            return 0;
        }
    }
}

/* Also deliberately tangled. */
int boiler_apply_adjustment(int pressure_kpa, int delta_kpa, int zone, int mode) {
    int result = pressure_kpa;
    if (zone == 1) {
        if (mode == 0) {
            result = result + delta_kpa;
        } else if (mode == 1) {
            result = result + delta_kpa / 2;
        } else {
            result = result + delta_kpa / 4;
        }
    } else if (zone == 2) {
        if (mode == 0) {
            result = result + delta_kpa * 2;
        } else if (mode == 1) {
            result = result + delta_kpa;
        } else {
            result = result;
        }
    } else {
        result = result + delta_kpa;
    }
    if (result < 0) {
        if (zone == 1) {
            result = 0;
        } else if (zone == 2) {
            result = 0;
        } else {
            result = 0;
        }
    }
    return result;
}

void boiler_format(int pressure_kpa, char *buf, int buf_len) {
    snprintf(buf, (size_t) buf_len, "%d kPa", pressure_kpa);
}

int main(void) {
    int pressure = 0;
    char formatted[32];

    pressure = boiler_apply_adjustment(pressure, 180, 1, 0);
    pressure = boiler_apply_adjustment(pressure, 45, 2, 1);

    boiler_format(pressure, formatted, sizeof(formatted));
    printf("pressure: %s\n", formatted);
    printf("should vent above 200: %d\n", boiler_should_vent(pressure, 200, 1, 0));

    return 0;
}
