/*
    Glipo

    Copyright (C) Glipo Technologies. All Rights Reserved.

    https://glipo.cf
*/

function getNotifications(type = "unread") {
    $("." + type + "Notifications").hide();
    $("#" + type + "NotificationsTab .loadingSpinner").show();

    $("." + type + "Notifications").html("");

    firebase.firestore().collection("users").doc(currentUser.uid).collection("" + type + "Notifications").orderBy("sent", "desc").get().then(function(notificationDocuments) {
        $("#" + type + "NotificationsTab .loadingSpinner").hide();
        $("." + type + "Notifications").show();

        if (notificationDocuments.docs.length > 0) {
            notificationDocuments.forEach(function(notificationDocument) {
                firebase.firestore().collection("users").doc(notificationDocument.data().sender).get().then(function(senderDocument) {
                    $("." + type + "Notifications").append(
                        $("<card class='post'>").append([
                            $("<div class='info'>").append([
                                (
                                    !senderDocument.exists ?
                                    $("<span>").text(_("Deleted user")) :
                                    $("<a class='group'>")
                                        .attr("href", "/u/" + senderDocument.data().username)
                                        .text("u/" + senderDocument.data().username)
                                ),
                                $("<span>").text(" · "),
                                $("<span>")
                                    .attr("title",
                                        lang.format(notificationDocument.data().sent.toDate(), lang.language, {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric"
                                        }) + " " +
                                        notificationDocument.data().sent.toDate().toLocaleTimeString(lang.language.replace(/_/g, "-"))
                                    )
                                    .text(timeDifferenceToHumanReadable(new Date().getTime() - notificationDocument.data().sent.toDate().getTime()))
                            ]),
                            $("<div class='postContent'>").html(renderMarkdown(notificationDocument.data().content))
                            ,
                            $("<div class='actions'>").append([
                                $("<div>").append([
                                    $("<button>")
                                        .attr("aria-label", _("Reply"))
                                        .append([
                                            $("<icon>").text("reply"),
                                            document.createTextNode(" "),
                                            $("<span>").text(_("Reply"))
                                        ])
                                        .click(function() {
                                            if (notificationDocument.data().type == "message") {
                                                window.location.href = "/dm?user=" + encodeURIComponent(senderDocument.data().username);
                                            }
                                        })
                                ]),
                                $("<div class='desktop'>").append([
                                    $("<button>")
                                        .attr("title", _("Report"))
                                        .attr("aria-label", _("Report this notification"))
                                        .append(
                                            $("<icon>").text("flag")
                                        )
                                ])
                            ])
                        ])
                    );
                });

                if (type == "unread") {
                    firebase.firestore().collection("users").doc(currentUser.uid).collection("unreadNotifications").doc(notificationDocument.id).delete().then(function() {
                        firebase.firestore().collection("users").doc(currentUser.uid).collection("archivedNotifications").doc(notificationDocument.id).set(notificationDocument.data());
                    });
                }
            });
        } else {
            if (type == "unread") {
                $(".unreadNotifications").append(
                    $("<div class='pageMessage middle'>").append([
                        $("<h1>").text(_("All caught up!")),
                        $("<p>").text(_("Looking for a notification from earlier? Check your archive!"))
                    ])
                );
            } else if (type == "archived") {
                $(".archivedNotifications").append(
                    $("<div class='pageMessage middle'>").append([
                        $("<h1>").text(_("No notifications yet!")),
                        $("<p>").text(_("You'll receive notifications here that have been previously read."))
                    ])
                );
            }
        }
    });
}

function getMessages() {
    $(".messageDms").hide();
    $("#messagesTab .loadingSpinner").show();

    $(".messageDms").html("");

    firebase.firestore().collection("users").doc(currentUser.uid).collection("dms").orderBy("lastSent", "desc").get().then(function(dmDocuments) {
        $("#messagesTab .loadingSpinner").hide();
        $(".messageDms").show();

        if (dmDocuments.docs.length > 0) {
            dmDocuments.forEach(function(dmDocument) {
                firebase.firestore().collection("usernames").doc(dmDocument.id).get().then(function(contactUsernameDocument) {
                    firebase.firestore().collection("users").doc(contactUsernameDocument.exists ? contactUsernameDocument.data().uid : "__NOUSER").get().then(function(contactDocument) {
                        $(".messageDms").append(
                            $("<card class='dm'>")
                                .append(
                                    $("<a>")
                                        .attr("href", "/dm?user=" + dmDocument.id)
                                        .text(
                                            !contactDocument.exists ?
                                            _("Deleted user") :
                                            "u/" + contactDocument.data().username
                                        )
                                    ,
                                    $("<div>").append([
                                        $("<span>").text(dmDocument.data().lastMessage.length > 100 ? dmDocument.data().lastMessage.substring(0, 100) + _("...") : dmDocument.data().lastMessage),
                                        $("<span>").text(" · "),
                                        $("<span>")
                                            .attr("title",
                                                lang.format(dmDocument.data().lastSent.toDate(), lang.language, {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric"
                                                }) + " " +
                                                dmDocument.data().lastSent.toDate().toLocaleTimeString(lang.language.replace(/_/g, "-"))
                                            )
                                            .text(timeDifferenceToHumanReadable(new Date().getTime() - dmDocument.data().lastSent.toDate().getTime()))
                                    ])
                                )
                                .click(function() {
                                    window.location.href = "/dm?user=" + dmDocument.id;
                                })
                        );
                    });
                });
            });
        } else {
            $(".messageDms").append(
                $("<div class='pageMessage middle'>").append([
                    $("<h1>").text(_("No messages yet!")),
                    $("<p>").text(_("To send a message to someone, visit their user profile."))
                ])
            );
        }
    });
}

function getDmMessages(user) {
    user = user.trim().toLowerCase();

    firebase.firestore().collection("usernames").doc(user).get().then(function(recipientUsernameDocument) {
        firebase.firestore().collection("users").doc(recipientUsernameDocument.exists ? recipientUsernameDocument.data().uid : "__NOUSER").get().then(function(recipientDocument) {
            firebase.firestore().collection("users").doc(currentUser.uid).collection("dms").doc(user).get().then(function(dmDocument) {                
                if (recipientDocument.exists || dmDocument.exists) {
                    if (recipientDocument.exists) {
                        $(".dmHeader").text(_("Messages with u/{0}", [recipientDocument.data().username]));
                    } else {
                        $(".dmHeader").text(_("Messages with a deleted user"));
                        $(".dmReplyContainer").html("").append(
                            $("<card class='middle'>").text(_("You cannot reply to a deleted user"))
                        );
                    }

                    $("#dmMessageReply textarea").attr("placeholder", _("Write your message here..."));
                
                    $(".pageNonExistent").hide();
                    $(".pageExistent").show();
                    $(".loadingDm").hide();
                    $(".loadedDm").show();

                    firebase.firestore().collection("users").doc(currentUser.uid).collection("dms").doc(user).collection("messages").orderBy("sent", "asc").onSnapshot(function(messageDocuments) {
                        $(".dmMessages").html("");

                        if (messageDocuments.docs.length > 0) {
                            firebase.firestore().collection("users").doc(currentUser.uid).get().then(function(userDocument) {
                                messageDocuments.forEach(function(messageDocument) {
                                    $(".dmMessages").append(
                                        $("<card class='post'>").append([
                                            $("<div class='info'>").append([
                                                (
                                                    (messageDocument.data().me || recipientDocument.exists) ?
                                                    $("<a class='group'>")
                                                        .attr("href",
                                                            messageDocument.data().me ?
                                                            "/u/" + userDocument.data().username :
                                                            "/u/" + recipientDocument.data().username
                                                        )
                                                        .text(
                                                            messageDocument.data().me ?
                                                            "u/" + userDocument.data().username :
                                                            "u/" + recipientDocument.data().username
                                                        )
                                                    :
                                                    $("<span>").text(_("Deleted user"))
                                                ),
                                                $("<span>").text(" · "),
                                                $("<span>")
                                                    .attr("title",
                                                        lang.format(messageDocument.data().sent.toDate(), lang.language, {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric"
                                                        }) + " " +
                                                        messageDocument.data().sent.toDate().toLocaleTimeString(lang.language.replace(/_/g, "-"))
                                                    )
                                                    .text(timeDifferenceToHumanReadable(new Date().getTime() - messageDocument.data().sent.toDate().getTime()))
                                            ]),
                                            $("<div class='postContent'>").html(renderMarkdown(messageDocument.data().content))
                                        ])
                                    );

                                    window.scrollTo(0, document.body.scrollHeight);
                                });
                            });
                        } else {
                            $(".dmMessages").append(
                                $("<p>").text(_("This is the beginning of something good... Write a message below to send it!"))
                            );
                        }
                    });
                } else {
                    $(".loadingDm").hide();
                    $(".pageExistent").hide();
                    $(".pageNonExistent").show();
                }
            });
        });
    });
}

function sendDmMessage() {
    var messageContent = $("#dmMessageReply textarea").val();

    if (messageContent.trim() == "") {
        $("#sendDmMessageError").text(_("Please enter the message you wish to send."));

        return;
    }

    if (messageContent.length > 10000) {
        $("#sendDmMessageError").text(_("Your message is too long! Please shorten it so that it's at most 10,000 characters long. You may want to split your message up into multiple parts."));

        return;
    }

    firebase.firestore().collection("users").doc(currentUser.uid).get().then(function(userDocument) {
        $(".dmMessages").append(
            $("<card class='post'>").append([
                $("<div class='info'>").append([
                    $("<a class='group'>")
                        .attr("href", "/u/" + userDocument.data().username)
                        .text("u/" + userDocument.data().username)
                    ,
                    $("<span>").text(" · "),
                    $("<span>").text(_("Literally just now"))
                ]),
                $("<div class='postContent'>").html(renderMarkdown(messageContent))
            ])
        );
    });

    $("#dmMessageReply textarea").val("");

    api.sendMessage({
        recipient: core.getURLParameter("user").trim(),
        content: messageContent
    }).catch(function(error) {
        console.error("Glipo backend error:", error);

        $("#sendDmMessageError").text(_("Sorry, an internal error has occurred and your last message couldn't be delivered to the sender."));
    });
}

$(function() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            if (trimPage(currentPage) == "notifications") {
                getNotifications("unread");
                getNotifications("archived");

                getMessages();
            } else if (trimPage(currentPage) == "dm") {
                if (core.getURLParameter("user") != null && core.getURLParameter("user").trim() != "") {
                    getDmMessages(core.getURLParameter("user").trim());
                } else {
                    window.location.replace("/notifications");
                }
            }

            firebase.firestore().collection("users").doc(user.uid).collection("unreadNotifications").onSnapshot(function(notificationDocuments) {
                if (notificationDocuments.docs.length > 0) {
                    $(".notificationsButton")
                        .addClass("yellow")
                        .attr("title", _("Notifications ({0})", [notificationDocuments.docs.length]))
                    ;

                    $(".notificationsButton icon")
                        .attr("aria-label", _("Notifications ({0})", [notificationDocuments.docs.length]))
                        .text("notifications_active")
                    ;
                } else {
                    $(".notificationsButton")
                        .removeClass("yellow")
                        .attr("title", _("Notifications"))
                    ;

                    $(".notificationsButton icon")
                        .attr("aria-label", _("Notifications"))
                        .attr("title", null)
                        .text("notifications")
                    ;
                }
            });
        }
    });
});