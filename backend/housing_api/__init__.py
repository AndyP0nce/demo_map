# Use PyMySQL as the MySQL driver (easier to install on Mac than mysqlclient)
# This line makes PyMySQL behave like MySQLdb which Django expects
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass  # mysqlclient is installed instead, which is fine
