/* Single-document sign-in keeps the pupil token in memory, not in URL/storage. */
location.replace(new URL('index.html',location.href).href);
