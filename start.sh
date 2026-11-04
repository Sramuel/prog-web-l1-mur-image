export PGHOST=/tmp/$LOGNAME
export PGPORT=$UID

/usr/lib/postgresql/15/bin/pg_ctl -D /tmp/$LOGNAME/ -l /tmp/$LOGNAME/startup.log initdb

pg_conftool -v /tmp/$LOGNAME/postgresql.conf set unix_socket_directories /tmp/$LOGNAME/

/usr/lib/postgresql/15/bin/pg_ctl -D /tmp/$LOGNAME/ -l /tmp/$LOGNAME/startup.log start

