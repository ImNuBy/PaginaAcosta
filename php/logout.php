<?php
session_start();
session_unset();
session_destroy();
header("Location: ../paginalogin/login.html"); // o tu página de login
exit();
