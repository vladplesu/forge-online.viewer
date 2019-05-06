const inputFile = $('#inputGroup');
const inputFileLbl = $('label[for="inputGroup"]');

inputFile.change(function() {
    const fileName = inputFile.prop('files');
    inputFileLbl.prop('innerText', fileName[0].name);
});
