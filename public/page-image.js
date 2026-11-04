let mainImage = document.querySelector('img');

mainImage.addEventListener('click', () => mainImage.width = mainImage.width + 10);

mainImage.addEventListener('contextmenu', (e) => {
(e.preventDefault());
mainImage.width = mainImage.width - 10;
});


let submitButton = document.querySelector('form input[type="submit"]');

submitButton.disabled = true;

let commentaire = document.querySelector('input[name="commentaire"]');

commentaire.addEventListener('keyup', () => { 
    if (commentaire.value == ""){
        submitButton.disabled = true;
    }
    else {
        submitButton.disabled = false;
    }
});