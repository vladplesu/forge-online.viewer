const $inputFile = $('#inputGroup');
const $inputFileLbl = $('label[for="inputGroup"]');
const $loadBtn = $('button[type="submit"]');
const $invalidFile = $('div.invalid-feedback');

$inputFile.change(function() {
    const fileName = $inputFile[0].files[0].name;

    const reg = /\.ifc$/;
    const isFileIFC = reg.test(fileName);

    $inputFileLbl[0].innerText = fileName;
    if (!isFileIFC) {
        $inputFile[0].classList.add('is-invalid');
        $invalidFile.slideDown('slow');
        $loadBtn[0].disabled = true;
        return;
    }
    $inputFile[0].classList.add('is-valid');
    $inputFile[0].classList.remove('is-invalid');
    $loadBtn[0].disabled = false;
    $loadBtn[0].classList.add('btn-primary');
    $loadBtn[0].classList.remove('btn-secondary');
    $invalidFile.slideUp('slow');
});
