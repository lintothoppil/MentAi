import traceback
try:
    import app
except Exception as e:
    with open('error.txt', 'w') as f:
        traceback.print_exc(file=f)
