$('form#contact_form').validate({
  messages: { },
  submitHandler: function(form) {
    $.ajax({
    url: "https://usebasin.com/f/c0f4b9ff0146.json",
      method: "POST",
      data: $(form).serialize(),
      dataType: "json",
      success: function(data) {
          $("form#contact_form :input").prop("disabled", true);
          $('#thanks').show();
      }
    });
    return false;
  }
});
