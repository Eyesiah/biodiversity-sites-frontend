import { Dialog, Heading, Flex } from "@chakra-ui/react";

const sizeMap = {
  md: "600px",
  lg: "70vw",
  xl: "90vw",
};

const Modal = ({ show, onClose, title, children, size = "lg" }) => {
  if (!show) {
    return null;
  }

  const maxWidth = sizeMap[size] || sizeMap.md;

  return (
    <Dialog.Root
      open={show}
      onOpenChange={(detail) => !detail.open && onClose()}
      placement="center"
    >
      <Dialog.Backdrop bg="rgba(74, 73, 73, 0.6)" />
      <Dialog.Positioner>
        <Dialog.Content
          bg="midnight"
          color="white"
          p="20px"
          borderRadius="md"
          width="90%"
          maxWidth={maxWidth}
          boxShadow="lg"
          textAlign="left"
          border="none"
        >
          <Flex
            as={Dialog.Header}
            p={0}
            bg="midnight"
            borderBottom="1px solid"
            borderColor="subtleBorder"
            paddingBottom="10px"
            marginBottom="20px"
            justify="space-between"
            align="center"
            borderRadius="md md 0 0"
          >
            <Dialog.Title asChild>
              <Heading as="h4" size="lg" fontSize="1.5rem" m={0}>
                {title}
              </Heading>
            </Dialog.Title>
            <Dialog.CloseTrigger
              bg="transparent"
              border="none"
              fontSize="2rem"
              color="white"
              cursor="pointer"
              lineHeight="1"
              padding="0"
              _hover={{
                bg: "subtleBorder",
                borderRadius: "sm",
              }}
              _focus={{
                outline: "2px solid",
                outlineColor: "brand.default",
                outlineOffset: "2px",
              }}
            >
              &times;
            </Dialog.CloseTrigger>
          </Flex>
          <Dialog.Body p={0} fontSize="1rem" lineHeight="1.6">
            {children}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export default Modal;
