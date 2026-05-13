from datetime import datetime, timezone, timedelta

def get_brasilia_tz():
    return timezone(timedelta(hours=-3))

def get_now_br():
    return datetime.now(get_brasilia_tz())

def get_now_utc():
    return datetime.now(timezone.utc)

def format_datetime_br(dt: datetime):
    if not dt:
        return ""
    # Se não tiver timezone, assume que é UTC (padrão antigo do banco) e converte
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc).astimezone(get_brasilia_tz())
    else:
        # Se já tiver timezone, apenas garante a conversão para Brasília
        dt = dt.astimezone(get_brasilia_tz())
    return dt.strftime("%d/%m/%Y %H:%M:%S")
