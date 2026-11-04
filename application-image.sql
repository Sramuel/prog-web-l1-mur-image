\c postgres
DROP DATABASE IF EXISTS "application_image";
CREATE DATABASE "application_image";

\c "application_image"

CREATE TABLE auteurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL
);

INSERT INTO auteurs(prenom, nom) VALUES ('Marcel', 'Duchamp'),('Elisa', 'Von Gloeden');

CREATE TABLE orientations (
    id SERIAL PRIMARY KEY,
    orientation_type VARCHAR(20) NOT NULL
);

INSERT INTO orientations(orientation_type) VALUES ('portrait'),('paysage');

CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    date DATE,
    fichier VARCHAR(255) NOT NULL,
    likes INT DEFAULT 0,
    id_auteur int references auteurs(id),
    orientation int references orientations(id)
);

CREATE TABLE commentaires (
    id SERIAL PRIMARY KEY,
    texte TEXT NOT NULL,
    id_image int references images(id)
);

CREATE TABLE account (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    salt BYTEA,
    hash BYTEA
);

CREATE TABLE accounts_images_like (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) REFERENCES account(username) ON DELETE CASCADE,
    id_image INT REFERENCES images(id) ON DELETE CASCADE
);

\i auteurs.sql

\i images.sql