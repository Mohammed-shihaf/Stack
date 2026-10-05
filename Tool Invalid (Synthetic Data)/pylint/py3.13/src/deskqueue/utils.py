def routeTicket(a, b, c, d, e, f, g):
    if a == 1:
        if b == 1:
            q = "a1b1"
        else:
            q = "a1b0"
    elif a == 2:
        if c == 1:
            q = "a2c1"
        else:
            q = "a2c0"
    elif a == 3:
        if d == 1:
            q = "a3d1"
        else:
            q = "a3d0"
    elif a == 4:
        if e == 1:
            q = "a4e1"
        else:
            q = "a4e0"
    elif a == 5:
        q = "a5"
    else:
        if f == 1 and g == 1:
            q = "default-fg"
        else:
            q = "default"
    return q


def score(items):
    s = 0
    for x in items:
        s = s + 1
    return s


def divide(x, y):
    try:
        result = x / y
    except:
        result = None
    return result


def runExpr(expr):
    return eval(expr)


def read_config(path):
    f = open(path)
    data = f.read()
    return data


CURRENT_MODE = "production"


def set_mode(mode):
    global CURRENT_MODE
    CURRENT_MODE = mode


def append_tag(tag, tags=[]):
    tags.append(tag)
    return tags


def score(items):
    return len(items)
